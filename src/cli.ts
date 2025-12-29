#!/usr/bin/env bun
/**
 * Kaller CLI Tool
 * ================
 * 
 * Usage:
 *   bun run cli search <term> [--type phone|name]
 *   bun run cli config
 *   bun run cli encrypt <plaintext>
 *   bun run cli decrypt <ciphertext>
 *   bun run cli verify <phone>
 *   bun run cli block <phone>
 */

import { getConfig, search, sendVerification, requestBlock } from "./api";
import { encrypt, decrypt } from "./crypto";

// Terminal colors
const c = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

function log(color: string, ...args: unknown[]) {
  console.log(color, ...args, c.reset);
}

function printHeader() {
  console.log();
  log(c.cyan + c.bright, "┌─────────────────────────────────────┐");
  log(c.cyan + c.bright, "│            Kaller CLI               │");
  log(c.cyan + c.bright, "└─────────────────────────────────────┘");
  console.log();
}

function printHelp() {
  console.log(`${c.bright}Usage:${c.reset}
  
  ${c.cyan}bun run cli config${c.reset}
    Get Firebase configuration
    
  ${c.cyan}bun run cli search <term> [--type phone|name]${c.reset}
    Search for a phone number or name
    
  ${c.cyan}bun run cli encrypt <plaintext>${c.reset}
    Encrypt a string using AES-128-ECB
    
  ${c.cyan}bun run cli decrypt <ciphertext>${c.reset}
    Decrypt an API response
    
  ${c.cyan}bun run cli verify <phone>${c.reset}
    Send verification SMS to a phone
    
  ${c.cyan}bun run cli block <phone>${c.reset}
    Request to block a phone number

${c.bright}Examples:${c.reset}
  
  ${c.dim}# Search by phone number${c.reset}
  bun run cli search 12345678
  
  ${c.dim}# Search by name${c.reset}
  bun run cli search "Ahmed" --type name
  
  ${c.dim}# Get config${c.reset}
  bun run cli config
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  printHeader();

  if (!command) {
    printHelp();
    return;
  }

  try {
    switch (command) {
      case "config": {
        log(c.yellow, "📡 Fetching config...\n");
        const config = await getConfig();
        log(c.green, "✅ Config loaded:\n");
        
        for (const [key, value] of Object.entries(config)) {
          let displayValue = String(value);
          if (key.includes("key") || key.includes("sec")) {
            displayValue = displayValue.substring(0, 20) + "...";
          }
          log(c.dim, `   ${key}:`, c.cyan, displayValue);
        }
        break;
      }

      case "search": {
        const term = args[1];
        if (!term) {
          log(c.red, "❌ Please provide a search term");
          return;
        }

        const typeFlag = args.indexOf("--type");
        const type = typeFlag !== -1 ? (args[typeFlag + 1] as "phone" | "name") : "phone";

        log(c.yellow, `🔍 Searching for "${term}" (type: ${type})...\n`);
        const results = await search(term, type);

        log(c.green, `✅ Found ${results.length} results:\n`);
        
        results.slice(0, 25).forEach((item, i) => {
          log(c.dim, `   ${String(i + 1).padStart(2)}.`, c.reset, item.name.padEnd(30), c.cyan, item.phone);
        });

        if (results.length > 25) {
          log(c.dim, `\n   ... and ${results.length - 25} more results`);
        }
        break;
      }

      case "encrypt": {
        const plaintext = args[1];
        if (!plaintext) {
          log(c.red, "❌ Please provide text to encrypt");
          return;
        }

        log(c.yellow, "🔐 Encrypting...\n");
        const encrypted = encrypt(plaintext);
        log(c.green, "✅ Encrypted:\n");
        log(c.cyan, `   ${encrypted}`);
        break;
      }

      case "decrypt": {
        const ciphertext = args[1];
        if (!ciphertext) {
          log(c.red, "❌ Please provide text to decrypt");
          return;
        }

        log(c.yellow, "🔓 Decrypting...\n");
        const decrypted = decrypt(ciphertext);
        log(c.green, "✅ Decrypted:\n");
        
        try {
          const parsed = JSON.parse(decrypted);
          console.log(JSON.stringify(parsed, null, 2));
        } catch {
          log(c.cyan, `   ${decrypted}`);
        }
        break;
      }

      case "verify": {
        const phone = args[1];
        if (!phone) {
          log(c.red, "❌ Please provide a phone number");
          return;
        }

        log(c.yellow, `📱 Sending verification to ${phone}...\n`);
        const result = await sendVerification(phone);
        log(c.green, "✅ Response:", c.cyan, result);
        break;
      }

      case "block": {
        const phone = args[1];
        if (!phone) {
          log(c.red, "❌ Please provide a phone number");
          return;
        }

        log(c.yellow, `🚫 Requesting block for ${phone}...\n`);
        const result = await requestBlock(phone);
        log(c.green, "✅ Response:", c.cyan, result);
        break;
      }

      case "help":
      case "--help":
      case "-h":
        printHelp();
        break;

      default:
        log(c.red, `❌ Unknown command: ${command}\n`);
        printHelp();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log(c.red, `\n❌ Error: ${message}`);
  }

  console.log();
}

main();
