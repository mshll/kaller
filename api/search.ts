export const config = { runtime: 'edge' };

import CryptoJS from 'crypto-js';

const AES_KEY = process.env.AES_KEY;
const FIREBASE_URL = process.env.FIREBASE_URL;
const USER_AGENT = "iPhone CFNetwork Darwin IchIJe";

function encrypt(plaintext: string): string {
  if (!AES_KEY) throw new Error('Not configured');
  const key = CryptoJS.enc.Utf8.parse(AES_KEY);
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString().replace(/\+/g, "-").replace(/=/g, "AaAaAa").replace(/\s/g, "").replace(/\n/g, "");
}

function decrypt(ciphertext: string): string {
  if (!AES_KEY) throw new Error('Not configured');
  const decoded = ciphertext.replace(/-/g, "+").replace(/AaAaAa/g, "=");
  const key = CryptoJS.enc.Utf8.parse(AES_KEY);
  const decrypted = CryptoJS.AES.decrypt(decoded, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

async function getConfig() {
  const response = await fetch(`${FIREBASE_URL}/config.json`);
  return response.json();
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
    });
  }

  if (!AES_KEY || !FIREBASE_URL) {
    return new Response(JSON.stringify({ error: 'Server not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const url = new URL(req.url);
  const term = url.searchParams.get('term');
  const type = url.searchParams.get('type') || 'phone';

  if (!term) {
    return new Response(JSON.stringify({ error: 'Missing term parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const cfg = await getConfig();
    const searchType = type === 'name' ? 1 : 2;
    const endpoint = type === 'name' ? 'getNumbersEncMotasel.php' : 'getNamesEnc02Motasel.php';
    const plaintext = `123term=${term}&234opt=${searchType}&234limit=100&234slt=123`;
    const encryptedCode = encrypt(plaintext);

    const response = await fetch(`${cfg.base}/${endpoint}?code=${encryptedCode}`, {
      headers: { "User-Agent": USER_AGENT },
    });

    const encryptedResponse = await response.text();
    const decrypted = decrypt(encryptedResponse);
    const results = JSON.parse(decrypted);

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
