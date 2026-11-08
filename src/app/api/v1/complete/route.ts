import { NextResponse } from "next/server"
import { cleanModel, fetchJson, findProvider, headers, isConfigured } from "@/lib/gateway"
import { authorize, creditCost, policyHeaders } from "@/lib/policy"
export const runtime = "nodejs"
export async function POST(req: Request) {
  try {
    const body = await req.json() as { model?: string; language?: string; prefix?: string; suffix?: string; instruction?: string; clientType?: string }
    const preflight = authorize(req, body, 0, { allowAnonymous: true })
    if (!preflight.ok) return NextResponse.json(preflight.error.body, { status: preflight.error.status, headers: preflight.error.headers })
    const identity = preflight.state.email || preflight.state.identity
    const provider = findProvider(body.model, identity)
    if (!provider || !isConfigured(provider, identity)) return NextResponse.json({ error: { message: "No configured provider" } }, { status: 503 })
    const anonymousFree = preflight.state.clientType !== "anonymous" || !body.model || body.model === "auto" || body.model.includes(":free") || body.model.includes("/free") || body.model.includes("pollinations:")
    if (!anonymousFree) return NextResponse.json({ error: { message: "Anonymous /v1 access is limited to selected free coding models" } }, { status: 403, headers: policyHeaders(preflight.state) })
    const policy = authorize(req, body, creditCost(body.model), { allowAnonymous: true })
    if (!policy.ok) return NextResponse.json(policy.error.body, { status: policy.error.status, headers: policy.error.headers })
    const model = body.model === "auto" ? (process.env.AUTO_MODEL || "openai") : (cleanModel(body.model, provider) || process.env.DEFAULT_MODEL || "openrouter/free")
    const prompt = `You are a precise ${body.language || "code"} autocomplete engine. Return only the code to insert, no markdown and no explanation.\n\nInstruction: ${body.instruction || "Complete the code naturally."}\n\nPrefix:\n${body.prefix || ""}\n\nSuffix:\n${body.suffix || ""}`
    const endpoint = provider.adapter === "anthropic" ? `${provider.baseUrl}/messages` : `${provider.baseUrl}/chat/completions`
    const payload = provider.adapter === "anthropic" ? { model, max_tokens: 256, messages: [{ role: "user", content: prompt }] } : { model, temperature: 0.1, max_tokens: 256, messages: [{ role: "user", content: prompt }] }
    const r = await fetchJson(endpoint, { method: "POST", headers: headers(provider, identity), body: JSON.stringify(payload) }, 60000)
    const data = await r.json() as { choices?: Array<{ text?: string; message?: { content?: string; reasoning?: string } }>; output_text?: string; content?: Array<{ text?: string }> }
    const completion = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || data.output_text || data.content?.map((x) => x.text || "").join("") || ""
    return NextResponse.json({ completion, model: `${provider.modelPrefix}${model}`, provider: provider.id }, { headers: policyHeaders(policy.state) })
  } catch (error) { return NextResponse.json({ error: { message: error instanceof Error ? error.message : "Completion error" } }, { status: 500 }) }
}
