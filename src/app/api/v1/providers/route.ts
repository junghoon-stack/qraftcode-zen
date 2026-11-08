import { NextResponse } from "next/server"
import { isConfigured, providers } from "@/lib/gateway"
import { authorize, policyHeaders } from "@/lib/policy"
export const runtime = "nodejs"
export async function GET(req: Request) { const policy = authorize(req); if (!policy.ok) return NextResponse.json(policy.error.body, { status: policy.error.status, headers: policy.error.headers }); const identity = policy.state.email || policy.state.identity; return NextResponse.json({ object: "list", data: providers.map(({ id, name, env, baseUrl, adapter, keyless }) => ({ id, name, env, baseUrl: baseUrl || null, adapter, keyless, status: isConfigured(providers.find((p) => p.id === id)!, identity) ? "configured" : "not_configured" })) }, { headers: policyHeaders(policy.state) }) }
