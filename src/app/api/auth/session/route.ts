import { NextResponse } from "next/server"
import { sessionEmail } from "@/lib/policy"
export const runtime = "nodejs"
export async function GET(req: Request) { const email = sessionEmail(req); return NextResponse.json({ authenticated: Boolean(email), email: email || null }) }
