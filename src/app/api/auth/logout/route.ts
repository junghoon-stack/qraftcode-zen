import { NextResponse } from "next/server"
import { clearSessionCookie } from "@/lib/policy"
export const runtime = "nodejs"
export async function POST() { const response = NextResponse.json({ authenticated: false }); response.headers.set("set-cookie", clearSessionCookie); return response }
