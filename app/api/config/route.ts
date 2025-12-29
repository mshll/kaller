import { NextResponse } from "next/server"
import { requireEnv, type FirebaseConfig } from "@/lib/config"

export const runtime = "edge"

export async function GET() {
  try {
    const FIREBASE_URL = requireEnv("FIREBASE_URL")

    const response = await fetch(`${FIREBASE_URL}/config.json`)
    const config: FirebaseConfig = await response.json()

    return NextResponse.json(config)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load config"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
