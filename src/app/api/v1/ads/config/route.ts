import { NextResponse } from "next/server"
import { adsConfig } from "@/lib/policy"
export const runtime = "nodejs"
export async function GET() { return NextResponse.json(adsConfig) }
