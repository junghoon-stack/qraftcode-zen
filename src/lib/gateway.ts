export type Adapter = "openai" | "anthropic"
export type Provider = { id: string; name: string; env: string; baseUrl: string; adapter: Adapter; configured: boolean; keyless: boolean; modelPrefix: string }

const definitions: Omit<Provider, "configured" | "keyless">[] = [
  { id: "openrouter", name: "OpenRouter", env: "OPENROUTER_API_KEY", baseUrl: "https://openrouter.ai/api/v1", adapter: "openai", modelPrefix: "openrouter:" },
  { id: "groq", name: "Groq", env: "groq_api_key", baseUrl: "https://api.groq.com/openai/v1", adapter: "openai", modelPrefix: "groq:" },
  { id: "mistral", name: "Mistral", env: "MISTRAL_API_KEY", baseUrl: "https://api.mistral.ai/v1", adapter: "openai", modelPrefix: "mistral:" },
  { id: "upstage", name: "Upstage", env: "UPSTAGE_API_KEY", baseUrl: "https://api.upstage.ai/v1", adapter: "openai", modelPrefix: "upstage:" },
  { id: "anthropic", name: "Anthropic", env: "ANTHROPIC_API_KEY", baseUrl: "https://api.anthropic.com/v1", adapter: "anthropic", modelPrefix: "anthropic:" },
  { id: "ai1api", name: "Ai1api", env: "OPEN_API_KEY", baseUrl: "https://ai1api.com/v1", adapter: "openai", modelPrefix: "ai1api:" },
  { id: "airforce", name: "Api.airforce", env: "AIRFORCE_API_KEY", baseUrl: "https://api.airforce/v1", adapter: "openai", modelPrefix: "airforce:" },
  { id: "ashna", name: "Ashna", env: "ASHNA_API_KEY", baseUrl: "https://api.ashna.ai/v1/api", adapter: "openai", modelPrefix: "ashna:" },
  { id: "chuizi", name: "Chuizi AI", env: "CHUIZI_API_KEY", baseUrl: "https://api.chuizi.ai/v1", adapter: "openai", modelPrefix: "chuizi:" },
  { id: "freemodel", name: "Freemodel.dev", env: "FREEMODEL_API_KEY", baseUrl: "https://api.freemodel.dev/v1", adapter: "openai", modelPrefix: "freemodel:" },
  { id: "llmsrelay", name: "LLMsRelay", env: "LLMSRELAY_API_KEY", baseUrl: "https://api.llmsrelay.com/v1", adapter: "openai", modelPrefix: "llmsrelay:" },
  { id: "opper", name: "Opper AI", env: "OPPER_API_KEY", baseUrl: "https://api.opper.ai/v3/compat", adapter: "openai", modelPrefix: "opper:" },
  { id: "routerlab", name: "RouterLab", env: "ROUTERLAB_API_KEY", baseUrl: "https://api.routerlab.ch/v1", adapter: "openai", modelPrefix: "routerlab:" },
  { id: "pollinations", name: "Pollinations", env: "POLLINATIONS_API_KEY", baseUrl: process.env.POLLINATIONS_BASE_URL || "https://gen.pollinations.ai/v1", adapter: "openai", modelPrefix: "pollinations:" },
  { id: "opus-proxy", name: "Opus Proxy", env: "OPUS_PROXY_API_KEY", baseUrl: process.env.OPUS_PROXY_BASE_URL || "", adapter: "openai", modelPrefix: "opus:" },
  { id: "opencode-zen", name: "Opencode Zen", env: "OPENCODE_ZEN_API_KEY", baseUrl: process.env.OPENCODE_ZEN_BASE_URL || "https://opencode.ai/zen/v1", adapter: "openai", modelPrefix: "zen:" },
  { id: "openapis-online", name: "OpenAPIs.online", env: "OPENAPIS_ONLINE_API_KEY", baseUrl: process.env.OPENAPIS_ONLINE_BASE_URL || "https://api.openapis.online/openai/v1", adapter: "openai", modelPrefix: "openapis:" },
  { id: "novita", name: "Novita AI", env: "NOVITA_API_KEY", baseUrl: process.env.NOVITA_BASE_URL || "https://api.novita.ai/openai", adapter: "openai", modelPrefix: "novita:" },
  { id: "nvidia-nim", name: "NVIDIA NIM", env: "NVIDIA_API_KEY", baseUrl: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1", adapter: "openai", modelPrefix: "nvidia:" },
  { id: "volcengine-ark", name: "Volcengine Ark", env: "ARK_API_KEY", baseUrl: process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3", adapter: "openai", modelPrefix: "ark:" },
  { id: "blazerail", name: "BlazeRail", env: "BLAZERAIL_API_KEY", baseUrl: process.env.BLAZERAIL_BASE_URL || "https://api.blazerail.com/v1", adapter: "openai", modelPrefix: "blazerail:" },
  { id: "felo", name: "Felo", env: "FELO_API_KEY", baseUrl: process.env.FELO_BASE_URL || "https://openapi.felo.ai/api/v1", adapter: "openai", modelPrefix: "felo:" },
  { id: "cleanapis", name: "Clean APIs", env: "CLEAN_API_KEY", baseUrl: process.env.CLEAN_BASE_URL || "https://www.cleanapis.com/v1", adapter: "openai", modelPrefix: "clean:" },
  { id: "sensenova", name: "SenseNova", env: "SENSENOVA_API_KEY", baseUrl: process.env.SENSENOVA_BASE_URL || "https://token.sensetime.com/api/v1", adapter: "openai", modelPrefix: "sensenova:" },
  { id: "vlmrun", name: "VLM Run", env: "VLMRUN_API_KEY", baseUrl: process.env.VLMRUN_BASE_URL || "https://gateway.vlm.run/openai", adapter: "openai", modelPrefix: "vlmrun:" },
]

export const providers: Provider[] = definitions.map((p) => ({ ...p, keyless: p.id === "pollinations", configured: Boolean(p.baseUrl) && (p.id === "pollinations" || Boolean(process.env[p.env])) }))
const runtimeKeys = new Map<string, Map<string, string>>()
export const key = (p: Provider, identity?: string) => runtimeKeys.get(identity || "")?.get(p.id) || process.env[p.env] || ""
export function setRuntimeKey(identity: string, providerId: string, value: string) {
  const provider = providers.find((p) => p.id === providerId)
  if (!provider || !value.trim()) return false
  const keys = runtimeKeys.get(identity) || new Map<string, string>()
  keys.set(providerId, value.trim()); runtimeKeys.set(identity, keys); return true
}
export function clearRuntimeKey(identity: string, providerId: string) { runtimeKeys.get(identity)?.delete(providerId) }
export function isConfigured(provider: Provider, identity?: string) { return provider.configured || Boolean(identity && runtimeKeys.get(identity)?.has(provider.id)) }

export const curatedFreeModels = [
  "openrouter:openrouter/free", "openrouter:google/gemma-4-31b-it:free", "openrouter:google/gemma-4-26b-a4b-it:free",
  "openrouter:nvidia/nemotron-3-ultra-550b-a55b:free", "openrouter:nvidia/nemotron-3.5-super-vl:free",
  "openrouter:nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", "openrouter:cohere/north-mini-code:free",
  "openrouter:xingchen-agi/xing4.0-29b-a4b:free", "openrouter:recursive/flint-v1.0:free", "openrouter:dots-studio/dots-3-note-preview:free",
]
export const curatedPollinationsModels = [
  "pollinations:deepseek/deepseek-v4.1-flash", "pollinations:minimax/minimax-m3.1-flash", "pollinations:qwen/qwen3.8-2.4t-a95b",
  "pollinations:nvidia/nemotron-3-ultra", "pollinations:meta/llama-3.3-70b-instruct", "pollinations:moonshotai/kimi-k3",
  "pollinations:z-ai/glm-5.3-flash", "pollinations:openai/gpt-5.4-mini", "pollinations:openai/gpt-5.4-nano",
]
export function findProvider(model?: string, identity?: string) {
  const value = model || ""
  const explicit = providers.find((p) => value.startsWith(p.modelPrefix) && isConfigured(p, identity))
  if (explicit) return explicit
  const candidates = providers.filter((p) => isConfigured(p, identity))
  if (value === "auto" || !value) return candidates.find((p) => p.id === "pollinations") || candidates.find((p) => p.id === "openrouter") || candidates.sort((a, b) => Number(b.keyless) - Number(a.keyless))[0]
  return candidates[0]
}
export function cleanModel(model: string | undefined, provider?: Provider) { return !model ? "" : provider && model.startsWith(provider.modelPrefix) ? model.slice(provider.modelPrefix.length) : model }
export function headers(provider: Provider, identity?: string): Record<string, string> {
  if (provider.adapter === "anthropic") return { "x-api-key": key(provider, identity), "anthropic-version": "2023-06-01", "content-type": "application/json" }
  const token = key(provider, identity)
  return { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" }
}
export async function fetchJson(url: string, init?: RequestInit, timeoutMs = 45000) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs); try { return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" }) } finally { clearTimeout(timer) } }
export const freeFallback = curatedFreeModels
