/**
 * AES-128-ECB Encryption/Decryption for Kaller API
 */

import CryptoJS from "crypto-js";
import { CONFIG } from "./config";

/**
 * Encrypt plaintext using AES-128-ECB
 * @param plaintext - The string to encrypt
 * @returns Encrypted and encoded string ready for API
 */
export function encrypt(plaintext: string): string {
  const key = CryptoJS.enc.Utf8.parse(CONFIG.AES_KEY);

  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Custom encoding: replace + with -, = with AaAaAa
  let encoded = encrypted.toString();
  return encoded
    .replace(/\+/g, "-")
    .replace(/=/g, "AaAaAa")
    .replace(/\s/g, "")
    .replace(/\n/g, "");
}

/**
 * Decrypt API response
 * @param ciphertext - The encrypted response from the API
 * @returns Decrypted string
 */
export function decrypt(ciphertext: string): string {
  // Reverse custom encoding
  const decoded = ciphertext
    .replace(/-/g, "+")
    .replace(/AaAaAa/g, "=");

  const key = CryptoJS.enc.Utf8.parse(CONFIG.AES_KEY);

  const decrypted = CryptoJS.AES.decrypt(decoded, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * Build and encrypt search parameters
 * @param term - Search term
 * @param type - Search type (1 = name, 2 = phone)
 * @param limit - Max results
 * @returns Encrypted parameter string
 */
export function encryptSearchParams(
  term: string,
  type: 1 | 2 = 2,
  limit: number = 100
): string {
  const plaintext = `123term=${term}&234opt=${type}&234limit=${limit}&234slt=123`;
  return encrypt(plaintext);
}
