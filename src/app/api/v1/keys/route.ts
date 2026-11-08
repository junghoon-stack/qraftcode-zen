import { NextResponse } from "next/server"
import { createZenApiKey, sessionEmail } from "@/lib/policy"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const email = sessionEmail(req)
  if (!email) return NextResponse.json({ error: { message: "Registration is required to issue a Zen API key" } }, { status: 401 })
  const key = createZenApiKey(email)
  return NextResponse.json({ object: "api_key", key, format: "sk-qraft-...", monthlyCreditLimit: 1000, warning: "Save this key now. It is shown only once." })
}
