export type Adapter = "openai" | "anthropic"
export type Provider = { id: string; name: string; env: string; baseUrl: string; adapter: Adapter; configured: boolean; modelPrefix: string }

const definitions: Omit<Provider, "configured">[] = [
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
  { id: "pollinations", name: "Pollinations", env: "POLLINATIONS_API_KEY", baseUrl: process.env.POLLINATIONS_BASE_URL || "https://text.pollinations.ai/openai", adapter: "openai", modelPrefix: "pollinations:" },
  { id: "opus-proxy", name: "Opus Proxy", env: "OPUS_PROXY_API_KEY", baseUrl: process.env.OPUS_PROXY_BASE_URL || "", adapter: "openai", modelPrefix: "opus:" },
  { id: "opencode-zen", name: "Opencode Zen", env: "OPENCODE_ZEN_API_KEY", baseUrl: process.env.OPENCODE_ZEN_BASE_URL || "", adapter: "openai", modelPrefix: "zen:" },
]

export const providers: Provider[] = definitions.map((p) => ({ ...p, configured: Boolean(process.env[p.env]) && Boolean(p.baseUrl) }))
export const key = (p: Provider) => process.env[p.env] || ""
export function findProvider(model?: string) {
  const value = model || ""
  return providers.find((p) => value.startsWith(p.modelPrefix)) || providers.find((p) => p.configured)
}
export function cleanModel(model: string | undefined, provider?: Provider) {
  if (!model) return ""
  if (provider && model.startsWith(provider.modelPrefix)) return model.slice(provider.modelPrefix.length)
  return model
}
export function headers(provider: Provider): Record<string, string> {
  if (provider.adapter === "anthropic") return { "x-api-key": key(provider), "anthropic-version": "2023-06-01", "content-type": "application/json" }
  return { authorization: `Bearer ${key(provider)}`, "content-type": "application/json" }
}
export async function fetchJson(url: string, init?: RequestInit, timeoutMs = 45000) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs)
  try { const r = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" }); return r }
  finally { clearTimeout(timer) }
}
export const freeFallback = [
  "openrouter:openrouter/free", "openrouter:google/gemma-4-26b-a4b-it:free", "openrouter:nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", "openrouter:cohere/north-mini-code:free",
]
