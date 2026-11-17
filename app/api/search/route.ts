import { NextRequest, NextResponse } from "next/server"
import { encodeSearchKeyword } from "@/lib/crypto"
import { USER_AGENT } from "@/lib/config"
import { getSearchToken } from "@/lib/directory-auth"
import { getSearchConfig, parseSearchResults, UPSTREAM_TIMEOUT_MS } from "@/lib/menodag"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const term = searchParams.get("term")?.trim()
  const type = searchParams.get("type") || "phone"

  if (!term) {
    return NextResponse.json({ error: "Missing term parameter" }, { status: 400 })
  }
  if (type !== "phone" && type !== "name") {
    return NextResponse.json({ error: "Invalid search type" }, { status: 400 })
  }

  try {
    const config = await getSearchConfig()
    const search = async (forceRefresh = false) => fetch(`${config.base}/search`, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        UserAgent: USER_AGENT,
        Accept: USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${await getSearchToken(forceRefresh)}`,
      },
      body: new URLSearchParams({
        keyword: encodeSearchKeyword(term),
        type: type === "phone" ? "1" : "2",
        code: "kw",
        lang: "en",
        showSpam: "0",
        version: "29",
      }),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
    let response = await search()
    if (response.status === 401) {
      response = await search(true)
    }
    if (!response.ok) {
      console.error("Directory service rejected search", {
        status: response.status,
        errorType: response.headers.get("x-amzn-ErrorType"),
        requestId: response.headers.get("x-amzn-RequestId"),
        detail: (await response.text()).slice(0, 512),
      })
      return NextResponse.json(
        { error: `Search service returned ${response.status}` },
        { status: response.status >= 400 ? response.status : 502 }
      )
    }

    const payload: unknown = await response.json()
    return NextResponse.json(parseSearchResults(payload))
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
