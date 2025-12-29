/**
 * Configuration and types for Kaller API
 */

export const USER_AGENT = "iPhone CFNetwork Darwin IchIJe"

export interface FirebaseConfig {
  base: string
  stripe_pub_key?: string
  stripe_sec_key?: string
  stripe_currency?: string
  stripe_price?: number
  stripe_desc?: string
  stripe_confirm_button?: string
  blockKnetAndroid?: string
  blockURL?: string
}

export interface SearchResult {
  name: string
  phone: string
}

export type SearchType = "phone" | "name"
export type SearchTypeCode = 1 | 2

/**
 * Get environment variable
 */
export function getEnv(name: string): string | undefined {
  return process.env[name]
}

/**
 * Require environment variable (throws if missing)
 */
export function requireEnv(name: string): string {
  const value = getEnv(name)
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}
