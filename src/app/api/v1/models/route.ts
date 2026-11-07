import { NextResponse } from "next/server"
import { fetchJson, freeFallback, providers, headers } from "@/lib/gateway"
import { authorize, policyHeaders } from "@/lib/policy"
export const runtime = "nodejs"
export async function GET(req: Request) {
  const policy = authorize(req)
  if (!policy.ok) return NextResponse.json(policy.error.body, { status: policy.error.status, headers: policy.error.headers })
  const results = await Promise.allSettled(providers.filter((p) => p.configured).map(async (p) => { const r = await fetchJson(`${p.baseUrl}/models`, { headers: headers(p) }); if (!r.ok) throw new Error(`${p.id}:${r.status}`); const body = await r.json() as { data?: Array<{ id: string; name?: string; pricing?: { prompt?: string; completion?: string }; context_length?: number }> }; return (body.data || []).map((m) => ({ id: `${p.modelPrefix}${m.id}`, name: m.name || m.id, provider: p.id, free: m.id.endsWith(":free") || Number(m.pricing?.prompt || 1) === 0, context: m.context_length || 0 })) }))
  const catalog = results.flatMap((r) => r.status === "fulfilled" ? r.value : []); const merged = [...catalog]
  for (const id of freeFallback) if (!merged.some((m) => m.id === id)) merged.push({ id, name: id.replace(/^openrouter:/, ""), provider: "openrouter", free: true, context: 0 })
  return NextResponse.json({ object: "list", data: merged, meta: { total: merged.length, free: merged.filter((m) => m.free).length, configuredProviders: providers.filter((p) => p.configured).map((p) => p.id) } }, { headers: policyHeaders(policy.state) })
}
