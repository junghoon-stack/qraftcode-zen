import { NextResponse } from "next/server"
import { clearRuntimeKey, isConfigured, providers, setRuntimeKey } from "@/lib/gateway"
import { sessionEmail } from "@/lib/policy"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const identity = sessionEmail(req)
  if (!identity) return NextResponse.json({ error: { message: "Registration is required" } }, { status: 401 })
  return NextResponse.json({ data: providers.map((p) => ({ id: p.id, name: p.name, env: p.env, baseUrl: p.baseUrl || null, keyless: p.keyless, configured: isConfigured(p, identity), keySource: p.configured ? "server" : "session" })) })
}

export async function POST(req: Request) {
  const identity = sessionEmail(req)
  if (!identity) return NextResponse.json({ error: { message: "Registration is required" } }, { status: 401 })
  const body = await req.json() as { provider?: string; apiKey?: string; action?: "set" | "clear" }
  const provider = providers.find((p) => p.id === body.provider)
  if (!provider) return NextResponse.json({ error: { message: "Unknown provider" } }, { status: 400 })
  if (body.action === "clear") clearRuntimeKey(identity, provider.id)
  else if (!setRuntimeKey(identity, provider.id, body.apiKey || "")) return NextResponse.json({ error: { message: "A non-empty API key is required" } }, { status: 400 })
  return NextResponse.json({ ok: true, provider: provider.id, configured: isConfigured(provider, identity), stored: "server-memory-only" })
}
