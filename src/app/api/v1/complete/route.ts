import { NextResponse } from "next/server"
import { cleanModel, fetchJson, findProvider, headers } from "@/lib/gateway"
import { authorize, policyHeaders } from "@/lib/policy"
export const runtime = "nodejs"
export async function POST(req: Request) {
  try {
    const body = await req.json() as { model?: string; language?: string; prefix?: string; suffix?: string; instruction?: string; clientType?: string }
    const policy = authorize(req, body, true)
    if (!policy.ok) return NextResponse.json(policy.error.body, { status: policy.error.status, headers: policy.error.headers })
    const provider = findProvider(body.model)
    if (!provider?.configured) return NextResponse.json({ error: { message: "No configured provider" } }, { status: 503, headers: policyHeaders(policy.state) })
    const model = cleanModel(body.model, provider) || process.env.DEFAULT_MODEL || "openrouter/free"
    const prompt = `You are a precise ${body.language || "code"} autocomplete engine. Return only the code to insert, no markdown and no explanation.\n\nInstruction: ${body.instruction || "Complete the code naturally."}\n\nPrefix:\n${body.prefix || ""}\n\nSuffix:\n${body.suffix || ""}`
    const endpoint = provider.adapter === "anthropic" ? `${provider.baseUrl}/messages` : `${provider.baseUrl}/chat/completions`
    const payload = provider.adapter === "anthropic" ? { model, max_tokens: 256, messages: [{ role: "user", content: prompt }] } : { model, temperature: 0.1, max_tokens: 256, messages: [{ role: "user", content: prompt }] }
    const r = await fetchJson(endpoint, { method: "POST", headers: headers(provider), body: JSON.stringify(payload) }, 60000)
    const data = await r.json() as { choices?: Array<{ text?: string; message?: { content?: string; reasoning?: string } }>; output_text?: string; content?: Array<{ text?: string }> }
    const completion = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || data.output_text || data.content?.map((x) => x.text || "").join("") || ""
    return NextResponse.json({ completion, model: `${provider.modelPrefix}${model}`, provider: provider.id }, { headers: policyHeaders(policy.state) })
  } catch (error) { return NextResponse.json({ error: { message: error instanceof Error ? error.message : "Completion error" } }, { status: 500 }) }
}
