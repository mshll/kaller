/**
 * Kaller API Client
 */

import { CONFIG, type FirebaseConfig, type SearchResult, type SearchType } from "./config";
import { decrypt, encryptSearchParams } from "./crypto";

/**
 * Fetch configuration from Firebase
 */
export async function getConfig(): Promise<FirebaseConfig> {
  const response = await fetch(`${CONFIG.FIREBASE_URL}/config.json`);

  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.status}`);
  }

  return response.json();
}

/**
 * Search for phone numbers or names
 * @param term - Search term
 * @param type - "phone" or "name"
 * @returns Array of search results
 */
export async function search(
  term: string,
  type: SearchType = "phone"
): Promise<SearchResult[]> {
  const config = await getConfig();
  const searchTypeCode = type === "name" ? 1 : 2;

  const encryptedCode = encryptSearchParams(term, searchTypeCode);

  const url = `${config.base}/getNamesEnc02Motasel.php?code=${encryptedCode}`;

  const response = await fetch(url, {
    headers: { "User-Agent": CONFIG.USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  const encryptedResponse = await response.text();
  const decrypted = decrypt(encryptedResponse);

  return JSON.parse(decrypted);
}

/**
 * Send verification SMS to a phone number
 * @param phone - Phone number
 * @returns Verification code
 */
export async function sendVerification(phone: string): Promise<string> {
  const config = await getConfig();
  const randomX = Math.floor(10000 + Math.random() * 90000);

  const url = `${config.base}/verify.php?to=${phone}&x=${randomX}`;

  const response = await fetch(url, {
    headers: { "User-Agent": CONFIG.USER_AGENT },
  });

  return response.text();
}

/**
 * Request to block a phone number
 * @param phone - Phone number to block
 * @returns Response from server
 */
export async function requestBlock(phone: string): Promise<string> {
  const config = await getConfig();
  const randomX = Math.floor(10000 + Math.random() * 90000);

  const url = `${config.base}/askForBlock.php?to=${phone}&x=${randomX}`;

  const response = await fetch(url, {
    headers: { "User-Agent": CONFIG.USER_AGENT },
  });

  return response.text();
}

/**
 * Execute block with Stripe payment
 * @param phone - Phone number to block
 * @param chargeId - Stripe charge ID
 * @returns Response from server
 */
export async function executeBlock(
  phone: string,
  chargeId: string
): Promise<string> {
  const config = await getConfig();

  const url = `${config.base}/blockEncMotasel.php?phone=${phone}&charge=${chargeId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "User-Agent": CONFIG.USER_AGENT },
  });

  return response.text();
}
