import { NextResponse } from "next/server"
import { fetchJson, findProvider, headers, isConfigured } from "@/lib/gateway"
import { authorize, creditCost, policyHeaders } from "@/lib/policy"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await req.json() as { model?: string; prompt?: string; n?: number; size?: string; response_format?: string; clientType?: string }
    if (!body.prompt?.trim()) return NextResponse.json({ error: { message: "prompt is required" } }, { status: 400 })
    const preflight = authorize(req, body, 0, { allowAnonymous: true })
    if (!preflight.ok) return NextResponse.json(preflight.error.body, { status: preflight.error.status, headers: preflight.error.headers })
    if (preflight.state.clientType === "anonymous" || preflight.state.clientType === "cli" || req.headers.get("x-client-type") === "cli") return NextResponse.json({ error: { message: "Image generation is available in the web workspace and Zen API, not anonymous or CLI access" } }, { status: 403, headers: policyHeaders(preflight.state) })
    const identity = preflight.state.email || preflight.state.identity
    if (body.model && !body.model.includes(":free") && !body.model.includes("/free") && !body.model.includes("pollinations:")) return NextResponse.json({ error: { message: "Only verified free image API models are currently available" } }, { status: 403, headers: policyHeaders(preflight.state) })
    const provider = findProvider(body.model, identity)
    if (!provider || !isConfigured(provider, identity) || provider.adapter !== "openai") return NextResponse.json({ error: { message: "No configured OpenAI-compatible image provider for this model" } }, { status: 503 })
    const policy = authorize(req, body, creditCost(body.model), { allowAnonymous: true })
    if (!policy.ok) return NextResponse.json(policy.error.body, { status: policy.error.status, headers: policy.error.headers })
    const model = body.model && body.model !== "auto" ? (body.model.startsWith(provider.modelPrefix) ? body.model.slice(provider.modelPrefix.length) : body.model) : (process.env.DEFAULT_IMAGE_MODEL || "dall-e-3")
    const upstream = await fetchJson(`${provider.baseUrl}/images/generations`, { method: "POST", headers: headers(provider, identity), body: JSON.stringify({ model, prompt: body.prompt, n: body.n || 1, size: body.size || "1024x1024", response_format: body.response_format }) }, 90000)
    return new NextResponse(await upstream.text(), { status: upstream.status, headers: { "content-type": upstream.headers.get("content-type") || "application/json", ...policyHeaders(policy.state) } })
  } catch (error) { return NextResponse.json({ error: { message: error instanceof Error ? error.message : "Image generation error" } }, { status: 500 }) }
}
