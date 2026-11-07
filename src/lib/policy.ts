import { createHmac, timingSafeEqual } from "node:crypto"

export type ClientType = "web" | "cli"
export type PolicyState = { clientType: ClientType; identity: string; rateLimit: number; rateRemaining: number; creditLimit: number; creditRemaining: number; creditCost: number; email?: string }

type CreditAccount = { clientType: ClientType; limit: number; remaining: number }
const users = new Set<string>()
const credits = new Map<string, CreditAccount>()
const requests = new Map<string, { window: number; count: number }>()
const WINDOW_MS = 60_000
const COOKIE = "qraftcode_session"
const secret = () => process.env.AUTH_SECRET || "qraftcode-local-development-secret"
const cookieValue = (email: string, expires: number) => {
  const payload = `${email}|${expires}`
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url")
  return `${Buffer.from(payload).toString("base64url")}.${signature}`
}
function readSession(req: Request): string | undefined {
  const raw = req.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  if (!raw) return undefined
  try {
    const [encoded, signature] = raw.split(".")
    const payload = Buffer.from(encoded, "base64url").toString()
    const expected = createHmac("sha256", secret()).update(payload).digest("base64url")
    if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return undefined
    const [email, expires] = payload.split("|")
    if (!email || !Number.isFinite(Number(expires)) || Number(expires) < Date.now() || !users.has(email)) return undefined
    return email
  } catch { return undefined }
}
export function sessionCookie(email: string) { return `${COOKIE}=${cookieValue(email, Date.now() + 7 * 24 * 60 * 60 * 1000)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800` }
export const clearSessionCookie = `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
export function registerEmail(email: string) { users.add(email.toLowerCase()); return email.toLowerCase() }
export function sessionEmail(req: Request) { return readSession(req) }
export function isValidEmail(email: unknown): email is string { return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }
function clientTypeFrom(req: Request, body?: { clientType?: unknown }): ClientType { return body?.clientType === "cli" || req.headers.get("x-client-type") === "cli" ? "cli" : "web" }
function requestIdentity(req: Request, clientType: ClientType, email?: string) {
  const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")
  if (apiKey) return `${clientType}:key:${createHmac("sha256", secret()).update(apiKey).digest("hex").slice(0, 24)}`
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return `${clientType}:${email || forwarded || req.headers.get("x-real-ip") || "unknown-ip"}`
}
function account(identity: string, clientType: ClientType) {
  const existing = credits.get(identity)
  if (existing) return existing
  const fresh = { clientType, limit: clientType === "cli" ? 100 : 50, remaining: clientType === "cli" ? 100 : 50 }
  credits.set(identity, fresh)
  return fresh
}
function baseHeaders(state: PolicyState) { return { "x-ratelimit-limit": String(state.rateLimit), "x-ratelimit-remaining": String(state.rateRemaining), "x-credit-limit": String(state.creditLimit), "x-credit-remaining": String(state.creditRemaining), "x-credit-cost": String(state.creditCost) } }
export function policyHeaders(state: PolicyState) { return baseHeaders(state) }
export function policyError(status: number, message: string, state?: PolicyState) { return { status, body: { error: { message } }, headers: state ? baseHeaders(state) : {} } }
export function creditCost(model?: string): number {
  const value = (model || "auto").toLowerCase()
  if (value === "auto" || value.includes(":free") || value.includes("/free") || value.includes("pollinations:")) return 1
  if (/(mini|small|haiku|flash|7b|8b|1\.5b|3b|coder)/.test(value)) return 1
  if (/(reason|thinking|o1|o3|opus|sonnet|70b|72b|405b)/.test(value)) return 4
  if (/(pro|max|ultra|large)/.test(value)) return 5
  return 2
}
export function authorize(req: Request, body?: { clientType?: unknown }, charge = 0): { ok: true; state: PolicyState } | { ok: false; error: ReturnType<typeof policyError> } {
  const clientType = clientTypeFrom(req, body)
  const email = readSession(req)
  if (clientType === "web" && !email) return { ok: false, error: policyError(401, "Registration is required for web chat and model use") }
  const identity = requestIdentity(req, clientType, email)
  const rateLimit = clientType === "cli" ? 60 : 30
  const now = Date.now(); const current = requests.get(identity)
  const entry = !current || now - current.window >= WINDOW_MS ? { window: now, count: 1 } : { ...current, count: current.count + 1 }
  requests.set(identity, entry)
  const credit = account(identity, clientType)
  const cost = Math.max(0, charge)
  const state: PolicyState = { clientType, identity, rateLimit, rateRemaining: Math.max(0, rateLimit - entry.count), creditLimit: credit.limit, creditRemaining: credit.remaining, creditCost: cost, email }
  if (entry.count > rateLimit) return { ok: false, error: policyError(429, "Rate limit exceeded", state) }
  if (cost > 0) {
    if (credit.remaining < cost) return { ok: false, error: policyError(402, `Credit limit exceeded; this model costs ${cost} credits`, state) }
    credit.remaining -= cost
    state.creditRemaining = credit.remaining
  }
  return { ok: true, state }
}
export function policyStatus() { return { auth: "signed-cookie-email-registration", authSecretRequiredInProduction: true, credits: { web: 50, cli: 100 }, modelCreditPricing: "free/auto=1, small=1, standard=2, premium/reasoning=4-5", rateLimitPerMinute: { web: 30, cli: 60 }, storage: "in-memory-best-effort" } }
export const adsConfig = { provider: "meta-audience-network", fallback: "placeholder", placements: { web: { banner: 1, interstitial: 0 }, cli: { banner: 2, interstitial: 1, interstitialEveryRequests: 5 } } }
