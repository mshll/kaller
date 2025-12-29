/**
 * AES-128-ECB Encryption/Decryption for Kaller API
 */

import CryptoJS from "crypto-js"

/**
 * Encrypt plaintext using AES-128-ECB
 */
export function encrypt(plaintext: string, aesKey: string): string {
  const key = CryptoJS.enc.Utf8.parse(aesKey)

  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  })

  // Custom encoding: replace + with -, = with AaAaAa
  return encrypted
    .toString()
    .replace(/\+/g, "-")
    .replace(/=/g, "AaAaAa")
    .replace(/\s/g, "")
    .replace(/\n/g, "")
}

/**
 * Decrypt API response
 */
export function decrypt(ciphertext: string, aesKey: string): string {
  // Reverse custom encoding
  const decoded = ciphertext.replace(/-/g, "+").replace(/AaAaAa/g, "=")

  const key = CryptoJS.enc.Utf8.parse(aesKey)

  const decrypted = CryptoJS.AES.decrypt(decoded, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  })

  return decrypted.toString(CryptoJS.enc.Utf8)
}

/**
 * Build and encrypt search parameters
 */
export function encryptSearchParams(
  term: string,
  type: 1 | 2,
  aesKey: string,
  limit: number = 100
): string {
  const plaintext = `123term=${term}&234opt=${type}&234limit=${limit}&234slt=123`
  return encrypt(plaintext, aesKey)
}
