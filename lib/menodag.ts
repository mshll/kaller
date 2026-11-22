import type { FirebaseConfig, SearchResult } from "./config"

const CONFIG_URL = "https://firebasestorage.googleapis.com/v0/b/menodag-b32f3.appspot.com/o/configGoldNew.txt?alt=media"
export const UPSTREAM_TIMEOUT_MS = 8000
let lastConfig: FirebaseConfig | undefined

export async function getSearchConfig(signal?: AbortSignal): Promise<FirebaseConfig> {
  let response: Response
  try {
    response = await fetch(CONFIG_URL, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.any([AbortSignal.timeout(UPSTREAM_TIMEOUT_MS), ...(signal ? [signal] : [])]),
    })
  } catch (error) {
    if (lastConfig && !signal?.aborted) return lastConfig
    throw error
  }
  if (!response.ok) {
    if (response.status >= 500 && lastConfig) return lastConfig
    throw new Error("Failed to load search configuration")
  }

  const config: unknown = await response.json()
  if (!config || typeof config !== "object" || !("base" in config) || typeof config.base !== "string") {
    throw new Error("Invalid search configuration")
  }

  const base = new URL(config.base.trim().replace(/\/+$/, ""))
  if (base.protocol !== "https:" || base.port || base.username || base.password || base.search || base.hash) {
    throw new Error("Invalid search service URL")
  }

  lastConfig = { ...config, base: base.toString().replace(/\/+$/, "") }
  return lastConfig
}

/** Match the APK's mode selection; unavailable verification uses its legacy route. */
export async function getSearchIntegrity(base: string, signal: AbortSignal): Promise<boolean | null> {
  try {
    const response = await fetch(`${base}/integrity-mode`, {
      cache: "no-store",
      redirect: "manual",
      headers: { Accept: "application/json" },
      signal: AbortSignal.any([signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]),
    })
    if (!response.ok) return null
    const mode: unknown = await response.json()
    if (mode && typeof mode === "object" && "schemaVersion" in mode && mode.schemaVersion === 1 &&
      "integrityEnabled" in mode && typeof mode.integrityEnabled === "boolean") {
      return mode.integrityEnabled
    }
    return null
  } catch (error) {
    if (signal.aborted) throw error
    return null
  }
}

export function parseSearchResults(payload: unknown): SearchResult[] {
  if (!payload || typeof payload !== "object" || !("results" in payload) || !Array.isArray(payload.results)) {
    throw new Error("Invalid search response")
  }

  return payload.results.filter((row: unknown): row is SearchResult => (
    row !== null && typeof row === "object" &&
    "name" in row && typeof row.name === "string" && row.name.trim().length > 0 &&
    "phone" in row && typeof row.phone === "string" && /^\+?\d[\d ()-]*$/.test(row.phone)
  )).map(({ name, phone }) => ({ name, phone }))
}
