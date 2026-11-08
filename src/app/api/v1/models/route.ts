import { NextResponse } from "next/server"
import { curatedFreeModels, curatedPollinationsModels, fetchJson, freeFallback, providers, headers, isConfigured } from "@/lib/gateway"
import { authorize, creditCost, policyHeaders } from "@/lib/policy"

export const runtime = "nodejs"
const MAX_MODELS_PER_PROVIDER = 10

function modelScore(model: { id: string; free: boolean; context: number }) {
  const id = model.id.toLowerCase()
  if (/audio|tts|speech|embed|rerank|image|video|vision-only/.test(id)) return -100
  let score = model.free ? 40 : 0
  if (/reason|thinking|coder|code|instruct|pro|large|ultra|opus|sonnet|nemotron|deepseek|qwen|gemma|llama|kimi/.test(id)) score += 20
  if (/mini|flash|nano|small|lite/.test(id)) score += 5
  score += Math.min(Math.floor(model.context / 32768), 15)
  return score
}

export async function GET(req: Request) {
  const policy = authorize(req)
  if (!policy.ok) return NextResponse.json(policy.error.body, { status: policy.error.status, headers: policy.error.headers })
  const identity = policy.state.email || policy.state.identity

  const results = await Promise.allSettled(providers.filter((p) => isConfigured(p, identity)).map(async (p) => {
    const endpoint = p.id === "pollinations"
      ? `${p.baseUrl}/models?category=text&reliability=reliable&limit=100`
      : `${p.baseUrl}/models`
    const r = await fetchJson(endpoint, { headers: headers(p, identity) })
    if (!r.ok) throw new Error(`${p.id}:${r.status}`)
    const body = await r.json() as { data?: Array<{ id: string; name?: string; pricing?: { prompt?: string; promptTextTokens?: string; completion?: string; completionTextTokens?: string }; context_length?: number; context_window?: number; health?: { status?: string } }> }
    const models = (body.data || []).map((m) => ({
      id: `${p.modelPrefix}${m.id}`,
      name: m.name || m.id,
      provider: p.id,
      free: m.id.endsWith(":free") || Number(m.pricing?.prompt || m.pricing?.promptTextTokens || 1) === 0,
      context: m.context_length || m.context_window || 0,
      health: m.health?.status,
    })).filter((m) => modelScore(m) > -100)
    const selected = models.sort((a, b) => modelScore(b) - modelScore(a) || a.name.localeCompare(b.name)).slice(0, MAX_MODELS_PER_PROVIDER)
    return { provider: p.id, models: selected, available: models.length }
  }))

  const providerResults = results.flatMap((r) => r.status === "fulfilled" ? [r.value] : [])
  const catalog = providerResults.flatMap((r) => r.models)
  const merged = catalog.filter((m) => !m.free || curatedFreeModels.includes(m.id) || (m.provider === "pollinations" && curatedPollinationsModels.includes(m.id)))
  for (const id of freeFallback) if (!merged.some((m) => m.id === id)) merged.push({ id, name: id.replace(/^openrouter:/, ""), provider: "openrouter", free: true, context: 0, health: undefined })

  const data = [
    { id: "auto", name: "Auto · best available / keyless first", provider: "auto", free: true, context: 0, creditCost: 1, keyless: providers.some((p) => p.configured && p.keyless) },
    ...merged.map((m) => ({ ...m, creditCost: creditCost(m.id), keyless: providers.find((p) => p.id === m.provider)?.keyless || false })),
  ]
  return NextResponse.json({
    object: "list",
    data,
    meta: {
      total: data.length,
      free: data.filter((m) => m.free).length,
      maxModelsPerProvider: MAX_MODELS_PER_PROVIDER,
      minModelsPerProvider: 3,
      configuredProviders: providers.filter((p) => isConfigured(p, identity)).map((p) => p.id),
      providerModelCounts: Object.fromEntries(providerResults.map((r) => [r.provider, { returned: r.models.length, available: r.available }])),
      pricing: { auto: 1, free: 1, small: 1, standard: 2, premium: 5, reasoning: 4 },
      keylessProviders: providers.filter((p) => isConfigured(p, identity) && p.keyless).map((p) => p.id),
    },
  }, { headers: policyHeaders(policy.state) })
}
