import { NextResponse } from "next/server"
import { cleanModel, fetchJson, findProvider, headers, key } from "@/lib/gateway"
export const runtime = "nodejs"
export async function POST(req: Request) {
  try {
    const body = await req.json() as { model?: string; messages?: Array<{ role: string; content: string | unknown }>; stream?: boolean; max_tokens?: number; temperature?: number }
    if (!Array.isArray(body.messages)) return NextResponse.json({ error: { message: "messages must be an array" } }, { status: 400 })
    const provider = findProvider(body.model)
    if (!provider?.configured) return NextResponse.json({ error: { message: "No configured provider for this model" } }, { status: 503 })
    const model = cleanModel(body.model, provider) || (process.env.DEFAULT_MODEL || "openrouter/free")
    const payload = { ...body, model, stream: body.stream !== false }
    const endpoint = provider.adapter === "anthropic" ? `${provider.baseUrl}/messages` : `${provider.baseUrl}/chat/completions`
    const upstream = await fetchJson(endpoint, { method: "POST", headers: headers(provider), body: JSON.stringify(payload) })
    if (!upstream.ok) return new NextResponse(await upstream.text(), { status: upstream.status, headers: { "content-type": upstream.headers.get("content-type") || "application/json" } })
    return new NextResponse(upstream.body, { status: 200, headers: { "content-type": upstream.headers.get("content-type") || "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" } })
  } catch (error) { return NextResponse.json({ error: { message: error instanceof Error ? error.message : "Gateway error" } }, { status: 500 }) }
}
