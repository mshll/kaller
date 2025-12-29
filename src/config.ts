/**
 * Configuration constants for Kaller API
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const CONFIG = {
  AES_KEY: requireEnv("AES_KEY"),
  FIREBASE_URL: requireEnv("FIREBASE_URL"),
  USER_AGENT: "iPhone CFNetwork Darwin IchIJe",
  DEFAULT_PORT: parseInt(process.env.PORT || "3000"),
} as const;

export type SearchType = "phone" | "name";
export type SearchTypeCode = 1 | 2;

export interface SearchResult {
  name: string;
  phone: string;
}

export interface FirebaseConfig {
  base: string;
  stripe_pub_key?: string;
  stripe_sec_key?: string;
  stripe_currency?: string;
  stripe_price?: number;
  stripe_desc?: string;
  stripe_confirm_button?: string;
  blockKnetAndroid?: string;
  blockURL?: string;
}
