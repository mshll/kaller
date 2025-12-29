import { NextRequest, NextResponse } from "next/server"
import { requireEnv, USER_AGENT } from "@/lib/config"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const phone = searchParams.get("phone")

  if (!phone) {
    return NextResponse.json({ error: "Missing phone parameter" }, { status: 400 })
  }

  try {
    const FIREBASE_URL = requireEnv("FIREBASE_URL")

    // Get config for API base URL
    const configResponse = await fetch(`${FIREBASE_URL}/config.json`)
    const config = await configResponse.json()

    const randomX = Math.floor(10000 + Math.random() * 90000)

    const response = await fetch(
      `${config.base}/askForBlock.php?to=${phone}&x=${randomX}`,
      { headers: { "User-Agent": USER_AGENT } }
    )

    const text = await response.text()
    return new Response(text, {
      headers: { "Content-Type": "text/plain" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Block request failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
