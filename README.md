# Kaller

> Kuwait phone directory lookup API

![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- 🔍 **Search** - Look up phone numbers or names
- 🔐 **Encryption** - Handles AES-128-ECB encryption/decryption automatically
- 🌐 **Web UI** - Beautiful interface for testing
- 💻 **CLI Tool** - Command-line interface
- 📦 **API Client** - Programmatic access

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.0 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/kaller.git
cd kaller

# Install dependencies
bun install
```

### Usage

#### Web Interface

```bash
bun run start
# Open http://localhost:3000
```

#### CLI

```bash
# Search by phone number
bun run cli search 12345678

# Search by name
bun run cli search "Ahmed" --type name

# Get config
bun run cli config

# See all commands
bun run cli --help
```

#### Programmatic

```typescript
import { search, getConfig } from "./src";

// Search for a phone number
const results = await search("12345678", "phone");
console.log(results);

// Search by name
const nameResults = await search("Ahmed", "name");

// Get config
const config = await getConfig();
```

## 📖 API Reference

### Endpoints

| Method | Endpoint                    | Description                      |
| ------ | --------------------------- | -------------------------------- |
| GET    | `/api/config`               | Get Firebase configuration       |
| GET    | `/api/search?term=X&type=Y` | Search (type: `phone` or `name`) |
| GET    | `/api/verify?phone=X`       | Send verification SMS            |
| GET    | `/api/block?phone=X`        | Request to block a number        |

### CLI Commands

```
bun run cli config                     # Get config
bun run cli search <term> [--type X]   # Search (type: phone|name)
bun run cli encrypt <text>             # Encrypt text
bun run cli decrypt <text>             # Decrypt text
bun run cli verify <phone>             # Send verification
bun run cli block <phone>              # Request block
```

## 🔐 Encryption Details

The API uses **AES-128-ECB** encryption with PKCS7 padding.

### Search Parameter Format

```
123term={search_term}&234opt={type}&234limit=100&234slt=123
```

Where `type` is:
- `1` = Search by name
- `2` = Search by phone number

## 🏗️ Project Structure

```
kaller/
├── src/
│   ├── api.ts        # API client functions
│   ├── cli.ts        # CLI tool
│   ├── config.ts     # Configuration & types
│   ├── crypto.ts     # Encryption/decryption
│   ├── index.ts      # Public exports
│   ├── server.ts     # Web server
│   └── template.html # Web UI
├── api/              # Vercel Edge Functions
├── public/           # Static files
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Development

```bash
# Copy environment variables
cp .env.example .env

# Run with hot reload
bun run dev

# Run CLI
bun run cli <command>
```

## ⚙️ Environment Variables

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `AES_KEY` | Yes | AES encryption key |
| `FIREBASE_URL` | Yes | Firebase Realtime DB URL |
| `PORT` | No | Server port (default: 3000) |

Copy `.env.example` to `.env` and fill in the values. For Vercel, set these in **Settings → Environment Variables**.

## 🚀 Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## ⚠️ Disclaimer

This project is for **educational purposes only**. Use responsibly and in accordance with applicable laws and terms of service.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

Made with ❤️ and Bun
