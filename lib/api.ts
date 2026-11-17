/**
 * Frontend API client for Kaller
 */

import type { SearchResult, SearchType, FirebaseConfig } from "./config"

/**
 * Search for phone numbers or names
 */
export async function search(
  term: string,
  type: SearchType,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const params = new URLSearchParams({ term, type })
  const response = await fetch(`/api/search?${params}`, { signal })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Search failed" }))
    throw new Error(error.error || "Search failed")
  }

  return response.json()
}

/**
 * Get Firebase configuration
 */
export async function getConfig(): Promise<FirebaseConfig> {
  const response = await fetch("/api/config")

  if (!response.ok) {
    throw new Error("Failed to load configuration")
  }

  return response.json()
}

/**
 * Send SMS verification to a phone number
 */
export async function sendVerification(phone: string): Promise<string> {
  const params = new URLSearchParams({ phone })
  const response = await fetch(`/api/verify?${params}`)

  if (!response.ok) {
    throw new Error("Verification failed")
  }

  return response.text()
}

/**
 * Request to block a phone number
 */
export async function requestBlock(phone: string): Promise<string> {
  const params = new URLSearchParams({ phone })
  const response = await fetch(`/api/block?${params}`)

  if (!response.ok) {
    throw new Error("Block request failed")
  }

  return response.text()
}
