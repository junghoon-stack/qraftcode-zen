import { NextResponse } from "next/server"
import { cleanModel, curatedFreeModels, fetchJson, findProvider, headers } from "@/lib/gateway"
import { authorize, creditCost, policyHeaders } from "@/lib/policy"
export const runtime = "nodejs"
export async function POST(req: Request) {
  try {
    const body = await req.json() as { model?: string; messages?: Array<{ role: string; content: string | unknown }>; stream?: boolean; max_tokens?: number; temperature?: number; clientType?: string }
    if (!Array.isArray(body.messages)) return NextResponse.json({ error: { message: "messages must be an array" } }, { status: 400 })
    const provider = findProvider(body.model)
    if (!provider?.configured) return NextResponse.json({ error: { message: "No configured provider for this model" } }, { status: 503 })
    const policy = authorize(req, body, creditCost(body.model))
    if (!policy.ok) return NextResponse.json(policy.error.body, { status: policy.error.status, headers: policy.error.headers })
    const model = body.model === "auto" ? (process.env.AUTO_MODEL || (provider.id === "openrouter" ? cleanModel(curatedFreeModels[0], provider) : "openai")) : (cleanModel(body.model, provider) || (process.env.DEFAULT_MODEL || "openrouter/free"))
    const upstream = await fetchJson(provider.adapter === "anthropic" ? `${provider.baseUrl}/messages` : `${provider.baseUrl}/chat/completions`, { method: "POST", headers: headers(provider), body: JSON.stringify({ ...body, model, stream: body.stream !== false }) })
    if (!upstream.ok) return new NextResponse(await upstream.text(), { status: upstream.status, headers: { "content-type": upstream.headers.get("content-type") || "application/json", ...policyHeaders(policy.state) } })
    return new NextResponse(upstream.body, { status: 200, headers: { "content-type": upstream.headers.get("content-type") || "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", ...policyHeaders(policy.state) } })
  } catch (error) { return NextResponse.json({ error: { message: error instanceof Error ? error.message : "Gateway error" } }, { status: 500 }) }
}
