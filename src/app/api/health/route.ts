import { NextResponse } from "next/server"
import { providers } from "@/lib/gateway"
export const runtime = "nodejs"
export async function GET() { return NextResponse.json({ service: "qraftcode-zen", status: "ok", gateway: "multi-provider", configuredProviders: providers.filter((p) => p.configured).map((p) => p.id), freeRouting: true, credentials: "server-side-only" }) }
