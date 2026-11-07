import { NextResponse } from "next/server"
import { isValidEmail, registerEmail, sessionCookie } from "@/lib/policy"
export const runtime = "nodejs"
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { email?: unknown }
  if (!isValidEmail(body.email)) return NextResponse.json({ error: { message: "A valid email is required" } }, { status: 400 })
  const email = registerEmail(body.email)
  const response = NextResponse.json({ authenticated: true, email })
  response.headers.set("set-cookie", sessionCookie(email))
  return response
}
