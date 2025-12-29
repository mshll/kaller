export const config = { runtime: 'edge' };

const FIREBASE_URL = process.env.FIREBASE_URL;
const USER_AGENT = "iPhone CFNetwork Darwin IchIJe";

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
    });
  }

  if (!FIREBASE_URL) {
    return new Response(JSON.stringify({ error: 'Server not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const url = new URL(req.url);
  const phone = url.searchParams.get('phone');

  if (!phone) {
    return new Response(JSON.stringify({ error: 'Missing phone parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const cfgRes = await fetch(`${FIREBASE_URL}/config.json`);
    const cfg = await cfgRes.json();
    const randomX = Math.floor(10000 + Math.random() * 90000);

    const response = await fetch(`${cfg.base}/verify.php?to=${phone}&x=${randomX}`, {
      headers: { "User-Agent": USER_AGENT },
    });

    const result = await response.text();
    return new Response(result, {
      headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Verification failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
