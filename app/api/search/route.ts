import { NextRequest, NextResponse } from "next/server"
import { encryptSearchParams, decrypt } from "@/lib/crypto"
import { requireEnv, USER_AGENT, type SearchResult } from "@/lib/config"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const term = searchParams.get("term")
  const type = searchParams.get("type") || "phone"

  if (!term) {
    return NextResponse.json({ error: "Missing term parameter" }, { status: 400 })
  }

  try {
    const AES_KEY = requireEnv("AES_KEY")
    const FIREBASE_URL = requireEnv("FIREBASE_URL")

    // Get config for API base URL
    const configResponse = await fetch(`${FIREBASE_URL}/config.json`)
    const config = await configResponse.json()

    // Encrypt search params
    // 'name' param = returns name (send phone number), 'phone' param = returns phone (send name)
    const searchType = type === "phone" ? 1 : 2
    const encryptedCode = encryptSearchParams(term, searchType as 1 | 2, AES_KEY)

    // Call the API
    const response = await fetch(
      `${config.base}/getNamesEnc02Motasel.php?code=${encryptedCode}`,
      { headers: { "User-Agent": USER_AGENT } }
    )

    const encryptedResponse = await response.text()
    const decrypted = decrypt(encryptedResponse, AES_KEY)
    const results: SearchResult[] = JSON.parse(decrypted)

    return NextResponse.json(results)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
