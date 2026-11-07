import { NextResponse } from "next/server"
import { providers } from "@/lib/gateway"
export const runtime = "nodejs"
export async function GET() { return NextResponse.json({ object: "list", data: providers.map(({ id, name, env, baseUrl, adapter, configured }) => ({ id, name, env, baseUrl: baseUrl || null, adapter, status: configured ? "configured" : "not_configured" })) }) }
