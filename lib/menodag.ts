import type { FirebaseConfig, SearchResult } from "./config"

const CONFIG_URL = "https://firebasestorage.googleapis.com/v0/b/menodag-b32f3.appspot.com/o/configGoldNew.txt?alt=media"
export const UPSTREAM_TIMEOUT_MS = 8000

export async function getSearchConfig(): Promise<FirebaseConfig> {
  const response = await fetch(CONFIG_URL, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  })
  if (!response.ok) {
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

  return { ...config, base: base.toString().replace(/\/+$/, "") }
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
