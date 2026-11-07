import { NextResponse } from "next/server"
import { providers } from "@/lib/gateway"
import { authorize, policyHeaders } from "@/lib/policy"
export const runtime = "nodejs"
export async function GET(req: Request) { const policy = authorize(req); if (!policy.ok) return NextResponse.json(policy.error.body, { status: policy.error.status, headers: policy.error.headers }); return NextResponse.json({ object: "list", data: providers.map(({ id, name, env, baseUrl, adapter, configured }) => ({ id, name, env, baseUrl: baseUrl || null, adapter, status: configured ? "configured" : "not_configured" })) }, { headers: policyHeaders(policy.state) }) }
