import CryptoJS from "crypto-js"
import { USER_AGENT, type SearchResult, type SearchType } from "./config"
import { parseSearchResults, UPSTREAM_TIMEOUT_MS } from "./menodag"

export class BackupRateLimitError extends Error {}

/** Use Kaller's previously configured encrypted API without changing the primary provider's verification. */
export async function searchConfiguredBackup(term: string, type: SearchType, signal: AbortSignal): Promise<SearchResult[] | null> {
  const aesKey = process.env.AES_KEY
  const firebaseURL = process.env.FIREBASE_URL
  if (!aesKey || !firebaseURL) return null
  if (term.includes("&")) throw new Error("Backup query contains an unsupported separator")

  const options = {
    cache: "no-store" as const,
    redirect: "manual" as const,
    signal: AbortSignal.any([signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]),
  }
  const configResponse = await fetch(`${firebaseURL.replace(/\/+$/, "")}/config.json`, options)
  if (configResponse.status === 429) throw new BackupRateLimitError("Backup configuration is rate limited")
  if (!configResponse.ok) throw new Error("Backup configuration unavailable")
  const config: unknown = await configResponse.json()
  if (!config || typeof config !== "object" || !("base" in config) || typeof config.base !== "string") {
    throw new Error("Invalid backup configuration")
  }
  const url = new URL(`${config.base.replace(/\/+$/, "")}/getNamesEnc02Motasel.php`)
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("Invalid backup service URL")
  }
  const key = CryptoJS.enc.Utf8.parse(aesKey)
  const plaintext = `123term=${term}&234opt=${type === "phone" ? 1 : 2}&234limit=100&234slt=123`
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7,
  }).toString().replace(/\+/g, "-").replace(/=/g, "AaAaAa")
  url.searchParams.set("code", encrypted)
  const response = await fetch(url, {
    ...options,
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.any([signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]),
  })
  if (response.status === 429) throw new BackupRateLimitError("Backup search is rate limited")
  if (!response.ok) throw new Error(`Backup search returned ${response.status}`)
  const ciphertext = (await response.text()).replace(/-/g, "+").replace(/AaAaAa/g, "=")
  const payload: unknown = JSON.parse(CryptoJS.AES.decrypt(ciphertext, key, {
    mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7,
  }).toString(CryptoJS.enc.Utf8))
  if (!Array.isArray(payload)) throw new Error("Invalid backup response")

  const rows = payload.map((row: unknown) => {
    if (type === "phone" && /^\d{8}$/.test(term) && row && typeof row === "object" &&
      "phone" in row && row.phone === `${term.slice(0, 4)}XXXX`) {
      return { ...row, phone: term }
    }
    return row
  })
  return parseSearchResults({ results: rows })
}
