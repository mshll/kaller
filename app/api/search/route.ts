import { NextRequest, NextResponse } from "next/server"
import { encodeSearchKeyword } from "@/lib/crypto"
import { USER_AGENT } from "@/lib/config"
import { getSearchToken } from "@/lib/directory-auth"
import { getSearchConfig, getSearchIntegrity, parseSearchResults, UPSTREAM_TIMEOUT_MS } from "@/lib/menodag"
import { BackupRateLimitError, searchConfiguredBackup } from "@/lib/search-backup"

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

  const signal = AbortSignal.timeout(30_000)
  let backupAttempted = false
  const backup = async () => {
    if (backupAttempted || signal.aborted) return null
    backupAttempted = true
    try {
      const results = await searchConfiguredBackup(term, type, signal)
      if (results !== null) {
        console.info("Directory search used configured encrypted backup")
        return NextResponse.json(results)
      }
      return null
    } catch (error) {
      if (error instanceof BackupRateLimitError) {
        return NextResponse.json({ error: "Backup lookup service is rate limited" }, { status: 429 })
      }
      console.warn("Configured directory backup unavailable", {
        message: error instanceof Error ? error.message : "Unknown failure",
      })
      return null
    }
  }

  try {
    const config = await getSearchConfig(signal)
    let integrity = await getSearchIntegrity(config.base, signal)
    const search = async (path: "/search" | "/names", token?: string) => fetch(`${config.base}${path}`, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        UserAgent: USER_AGENT,
        Accept: USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      signal: AbortSignal.any([signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]),
    })
    let usedLegacy = false
    const attempt = async (forceRefresh = false) => {
      if (integrity === false) {
        try {
          const token = await getSearchToken(forceRefresh, AbortSignal.any([signal, AbortSignal.timeout(15_000)]))
          signal.throwIfAborted()
          return await search("/search", token)
        } catch (error) {
          signal.throwIfAborted()
          console.warn("Directory verification or connection unavailable", {
            message: error instanceof Error ? error.message : "Unknown failure",
          })
        }
      }
      usedLegacy = true
      return search("/names")
    }
    let response = await attempt()
    if (response.status === 401 && !usedLegacy) {
      integrity = await getSearchIntegrity(config.base, signal)
      response = await attempt(true)
    }
    if (response.status === 401 && !usedLegacy && integrity === false) {
      usedLegacy = true
      response = await search("/names")
    }
    if (!response.ok) {
      console.error("Directory service rejected search", {
        status: response.status,
        route: usedLegacy ? "/names" : "/search",
        integrityEnabled: integrity,
        errorType: response.headers.get("x-amzn-ErrorType"),
        requestId: response.headers.get("x-amzn-RequestId"),
      })
      if (response.status !== 429) {
        const recovered = await backup()
        if (recovered !== null) return recovered
      }
      return NextResponse.json(
        { error: `Search service returned ${response.status}` },
        { status: response.status >= 400 ? response.status : 502 }
      )
    }

    const payload: unknown = await response.json()
    const results = parseSearchResults(payload)
    if (usedLegacy) {
      console.info("Directory search used legacy route", { integrityEnabled: integrity })
    }
    return NextResponse.json(results)
  } catch (error) {
    const recovered = await backup()
    if (recovered !== null) return recovered
    const message = error instanceof Error ? error.message : "Search failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
