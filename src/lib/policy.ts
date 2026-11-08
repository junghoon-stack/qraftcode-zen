import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

export type ClientType = "web" | "cli" | "api" | "anonymous"
export type PolicyState = { clientType: ClientType; identity: string; rateLimit: number; rateRemaining: number; creditLimit: number; creditRemaining: number; creditCost: number; email?: string; monthlyLimit?: number; apiKey?: boolean; anonymous?: boolean }
type CreditAccount = { clientType: ClientType; limit: number; remaining: number; exhaustedAt?: number; month?: string }
const users = new Set<string>()
const credits = new Map<string, CreditAccount>()
const requests = new Map<string, { window: number; count: number }>()
const apiKeys = new Map<string, { identity: string; email?: string; month: string }>()
const WINDOW_MS = 60_000
const ANONYMOUS_CREDITS = 5
const API_MONTHLY_CREDITS = 1000
const ANONYMOUS_REISSUE_AFTER_MS = 7 * 24 * 60 * 60 * 1000
const COOKIE = "qraftcode_session"
const secret = () => process.env.AUTH_SECRET || "qraftcode-local-development-secret"
const monthKey = () => new Date().toISOString().slice(0, 7)
const cookieValue = (email: string, expires: number) => { const payload = `${email}|${expires}`; const signature = createHmac("sha256", secret()).update(payload).digest("base64url"); return `${Buffer.from(payload).toString("base64url")}.${signature}` }
function readSession(req: Request): string | undefined {
  const raw = req.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  if (!raw) return undefined
  try { const [encoded, signature] = raw.split("."); const payload = Buffer.from(encoded, "base64url").toString(); const expected = createHmac("sha256", secret()).update(payload).digest("base64url"); if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return undefined; const [email, expires] = payload.split("|"); if (!email || !Number.isFinite(Number(expires)) || Number(expires) < Date.now() || !users.has(email)) return undefined; return email } catch { return undefined }
}
export function sessionCookie(email: string) { return `${COOKIE}=${cookieValue(email, Date.now() + 7 * 24 * 60 * 60 * 1000)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800` }
export const clearSessionCookie = `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
export function registerEmail(email: string) { users.add(email.toLowerCase()); return email.toLowerCase() }
export function sessionEmail(req: Request) { return readSession(req) }
export function isValidEmail(email: unknown): email is string { return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }
function forwardedIp(req: Request) { return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown-ip" }
function suppliedApiKey(req: Request) { const raw = req.headers.get("x-api-key") || req.headers.get("authorization") || ""; return raw.toLowerCase().startsWith("bearer ") ? raw.slice(7).trim() : raw.trim() }
function isZenApiKey(value: string) { return /^sk-qraft-[A-Za-z0-9_-]{24,}$/.test(value) }
function isAnonymousPath(req: Request) { return new URL(req.url).pathname === "/v1" || new URL(req.url).pathname.startsWith("/v1/") }
function clientTypeFrom(req: Request, body?: { clientType?: unknown }): ClientType { if (isAnonymousPath(req) && !suppliedApiKey(req)) return "anonymous"; if (isZenApiKey(suppliedApiKey(req))) return "api"; if (body?.clientType === "cli" || req.headers.get("x-client-type") === "cli") return "cli"; return "web" }
function requestIdentity(req: Request, clientType: ClientType, email?: string, apiKey?: string) { if (apiKey && isZenApiKey(apiKey)) return `api:key:${createHmac("sha256", secret()).update(apiKey).digest("hex").slice(0, 24)}`; return `${clientType}:${email || forwardedIp(req)}` }
function account(identity: string, clientType: ClientType, apiKey?: string): CreditAccount {
  const existing = credits.get(identity)
  if (clientType === "api" && apiKey) { const currentMonth = monthKey(); if (!existing || existing.month !== currentMonth) { const fresh = { clientType, limit: API_MONTHLY_CREDITS, remaining: API_MONTHLY_CREDITS, month: currentMonth }; credits.set(identity, fresh); return fresh } }
  if (existing) return existing
  const limit = clientType === "api" ? API_MONTHLY_CREDITS : clientType === "cli" ? 100 : clientType === "anonymous" ? ANONYMOUS_CREDITS : 50
  const fresh = { clientType, limit, remaining: limit, month: clientType === "api" ? monthKey() : undefined }
  credits.set(identity, fresh); return fresh
}
export function createZenApiKey(email?: string) { const value = `sk-qraft-${randomBytes(18).toString("base64url")}`; const identity = `api:key:${createHmac("sha256", secret()).update(value).digest("hex").slice(0, 24)}`; apiKeys.set(value, { identity, email, month: monthKey() }); account(identity, "api", value); return value }
export function validZenApiKey(value: string) { return isZenApiKey(value) && apiKeys.has(value) }
function baseHeaders(state: PolicyState) { return { "x-ratelimit-limit": String(state.rateLimit), "x-ratelimit-remaining": String(state.rateRemaining), "x-credit-limit": String(state.creditLimit), "x-credit-remaining": String(state.creditRemaining), "x-credit-cost": String(state.creditCost), ...(state.monthlyLimit ? { "x-monthly-credit-limit": String(state.monthlyLimit) } : {}) } }
export function policyHeaders(state: PolicyState) { return baseHeaders(state) }
export function policyError(status: number, message: string, state?: PolicyState) { return { status, body: { error: { message } }, headers: state ? baseHeaders(state) : {} } }
export function creditCost(model?: string): number { const value = (model || "auto").toLowerCase(); if (value === "auto" || value.includes(":free") || value.includes("/free") || value.includes("pollinations:")) return 1; if (/(mini|small|haiku|flash|7b|8b|1\.5b|3b|coder)/.test(value)) return 1; if (/(reason|thinking|o1|o3|opus|sonnet|70b|72b|405b)/.test(value)) return 4; if (/(pro|max|ultra|large)/.test(value)) return 5; return 2 }
export function authorize(req: Request, body?: { clientType?: unknown }, charge = 0, options: { allowAnonymous?: boolean } = {}): { ok: true; state: PolicyState } | { ok: false; error: ReturnType<typeof policyError> } {
  const clientType = clientTypeFrom(req, body); const apiKey = suppliedApiKey(req); const email = readSession(req)
  if (clientType === "web" && !email && !isAnonymousPath(req) && !validZenApiKey(apiKey)) return { ok: false, error: policyError(401, "Registration is required for web chat and model use") }
  if (clientType === "api" && !validZenApiKey(apiKey)) return { ok: false, error: policyError(401, "A valid sk-qraft API key is required") }
  if (clientType === "anonymous" && !options.allowAnonymous) return { ok: false, error: policyError(401, "Anonymous access is available only on the public /v1 gateway") }
  const identity = requestIdentity(req, clientType, email, apiKey); const rateLimit = clientType === "cli" ? 60 : clientType === "api" ? 120 : clientType === "anonymous" ? 12 : 30
  const now = Date.now(); const current = requests.get(identity); const entry = !current || now - current.window >= WINDOW_MS ? { window: now, count: 1 } : { ...current, count: current.count + 1 }; requests.set(identity, entry)
  const credit = account(identity, clientType, apiKey)
  if (clientType === "anonymous" && credit.remaining <= 0) { if (!credit.exhaustedAt) credit.exhaustedAt = now; if (now - credit.exhaustedAt < ANONYMOUS_REISSUE_AFTER_MS) return { ok: false, error: policyError(402, "Anonymous credits are exhausted; a new anonymous account will be available in 1 week") }; credit.remaining = ANONYMOUS_CREDITS; credit.exhaustedAt = undefined }
  const cost = Math.max(0, charge); const state: PolicyState = { clientType, identity, rateLimit, rateRemaining: Math.max(0, rateLimit - entry.count), creditLimit: credit.limit, creditRemaining: credit.remaining, creditCost: cost, email, monthlyLimit: clientType === "api" ? API_MONTHLY_CREDITS : undefined, apiKey: clientType === "api", anonymous: clientType === "anonymous" }
  if (entry.count > rateLimit) return { ok: false, error: policyError(429, "Rate limit exceeded", state) }
  if (cost > 0) { if (credit.remaining < cost) { if (clientType === "anonymous") credit.exhaustedAt = credit.exhaustedAt || now; return { ok: false, error: policyError(402, `Credit limit exceeded; this model costs ${cost} credits`, state) } } credit.remaining -= cost; state.creditRemaining = credit.remaining }
  return { ok: true, state }
}
export function policyStatus() { return { auth: "signed-cookie-email-registration-or-sk-qraft-api-key", anonymousGateway: "/v1", credits: { web: 50, cli: 100, apiMonthly: API_MONTHLY_CREDITS, anonymous: ANONYMOUS_CREDITS }, anonymousReissue: "7 days after exhaustion", modelCreditPricing: "free/auto=1, small=1, standard=2, premium/reasoning=4-5", rateLimitPerMinute: { web: 30, cli: 60, api: 120, anonymous: 12 }, storage: "in-memory-best-effort" } }
export const adsConfig = { provider: "meta-audience-network", fallback: "placeholder", placements: { web: { banner: 1, interstitial: 0 }, cli: { banner: 2, interstitial: 1, interstitialEveryRequests: 5 } } }
