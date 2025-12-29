#!/usr/bin/env bun
/**
 * Kaller API Server
 * ==================
 * Web server with beautiful UI for testing the API
 * 
 * Usage: bun run start
 * Open: http://localhost:3000
 */

import { CONFIG } from "./config";
import { getConfig, search, sendVerification, requestBlock } from "./api";
import { encrypt, decrypt } from "./crypto";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : CONFIG.DEFAULT_PORT;

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// HTML Template
const html = await Bun.file(new URL("./template.html", import.meta.url).pathname).text();

const server = Bun.serve({
  port: PORT,
  
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Serve HTML
      if (path === "/" || path === "/index.html") {
        return new Response(html, {
          headers: { "Content-Type": "text/html", ...corsHeaders },
        });
      }

      // API: Config
      if (path === "/api/config") {
        const config = await getConfig();
        return Response.json(config, { headers: corsHeaders });
      }

      // API: Search
      if (path === "/api/search") {
        const term = url.searchParams.get("term");
        const type = (url.searchParams.get("type") || "phone") as "phone" | "name";

        if (!term) {
          return Response.json(
            { error: "Missing term parameter" },
            { status: 400, headers: corsHeaders }
          );
        }

        console.log(`🔍 Search: "${term}" (${type})`);

        try {
          const results = await search(term, type);
          console.log(`   ✅ Found ${results.length} results`);
          return Response.json(results, { headers: corsHeaders });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.log(`   ❌ Error: ${message}`);
          return Response.json(
            { error: message },
            { status: 500, headers: corsHeaders }
          );
        }
      }

      // API: Encrypt (utility)
      if (path === "/api/encrypt") {
        const text = url.searchParams.get("text");
        if (!text) {
          return Response.json(
            { error: "Missing text parameter" },
            { status: 400, headers: corsHeaders }
          );
        }
        const encrypted = encrypt(text);
        return Response.json({ encrypted }, { headers: corsHeaders });
      }

      // API: Decrypt (utility)
      if (path === "/api/decrypt") {
        const text = url.searchParams.get("text");
        if (!text) {
          return Response.json(
            { error: "Missing text parameter" },
            { status: 400, headers: corsHeaders }
          );
        }
        try {
          const decrypted = decrypt(text);
          return Response.json({ decrypted }, { headers: corsHeaders });
        } catch (e) {
          return Response.json(
            { error: "Decryption failed" },
            { status: 400, headers: corsHeaders }
          );
        }
      }

      // API: Verify
      if (path === "/api/verify") {
        const phone = url.searchParams.get("phone");
        if (!phone) {
          return new Response("Missing phone parameter", {
            status: 400,
            headers: corsHeaders,
          });
        }

        console.log(`📱 Verify: ${phone}`);
        const result = await sendVerification(phone);
        console.log(`   Response: ${result}`);
        
        return new Response(result, { headers: corsHeaders });
      }

      // API: Block
      if (path === "/api/block") {
        const phone = url.searchParams.get("phone");
        if (!phone) {
          return new Response("Missing phone parameter", {
            status: 400,
            headers: corsHeaders,
          });
        }

        console.log(`🚫 Block: ${phone}`);
        const result = await requestBlock(phone);
        console.log(`   Response: ${result}`);
        
        return new Response(result, { headers: corsHeaders });
      }

      // 404
      return new Response("Not Found", { status: 404, headers: corsHeaders });
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Server error:", message);
      return Response.json(
        { error: message },
        { status: 500, headers: corsHeaders }
      );
    }
  },
});

console.log(`
┌──────────────────────────────────────────────────┐
│              Kaller API Server                   │
├──────────────────────────────────────────────────┤
│  🌐 Web UI:  http://localhost:${PORT}                │
│  📡 API:     http://localhost:${PORT}/api/...        │
└──────────────────────────────────────────────────┘

API Endpoints:
  GET /api/config                  - Get config
  GET /api/search?term=X&type=Y    - Search (type: phone|name)
  GET /api/encrypt?text=X          - Encrypt text
  GET /api/decrypt?text=X          - Decrypt text
  GET /api/verify?phone=X          - Send verification
  GET /api/block?phone=X           - Request block

Waiting for requests...
`);
