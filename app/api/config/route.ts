import { NextResponse } from "next/server"
import { getSearchConfig } from "@/lib/menodag"

export const runtime = "nodejs"

export async function GET() {
  try {
    const config = await getSearchConfig()

    return NextResponse.json(config)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load config"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
