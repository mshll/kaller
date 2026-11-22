import { after, afterEach, test } from "node:test"
import assert from "node:assert/strict"
import { NextRequest } from "next/server"
import CryptoJS from "crypto-js"

const originalFetch = globalThis.fetch
const originalAESKey = process.env.AES_KEY
const originalFirebaseURL = process.env.FIREBASE_URL
delete process.env.AES_KEY
delete process.env.FIREBASE_URL
const unexpectedFetch: typeof fetch = async () => { throw new Error("Unexpected network request in test") }
let testFetch = unexpectedFetch
// Firebase's Node SDK captures fetch at import; keep its requests inside the test dispatcher.
globalThis.fetch = (input, init) => testFetch(input, init)
const { GET } = await import("./route")
const { GET: getConfig } = await import("../config/route")
const { getApp } = await import("firebase/app")
const { getAuth, onIdTokenChanged, signOut } = await import("firebase/auth")
const { getSearchToken } = await import("@/lib/directory-auth")
const { searchConfiguredBackup } = await import("@/lib/search-backup")
const base = "https://example.execute-api.ca-central-1.amazonaws.com/stage"

after(() => {
  globalThis.fetch = originalFetch
  if (originalAESKey === undefined) delete process.env.AES_KEY
  else process.env.AES_KEY = originalAESKey
  if (originalFirebaseURL === undefined) delete process.env.FIREBASE_URL
  else process.env.FIREBASE_URL = originalFirebaseURL
})

afterEach(async () => {
  await signOut(getAuth(getApp("menodag-search")))
  testFetch = unexpectedFetch
  delete process.env.AES_KEY
  delete process.env.FIREBASE_URL
})

const authResponse = {
  idToken: "test-id-token",
  refreshToken: "test-refresh-token",
  expiresIn: "3600",
  localId: "test-user",
  isNewUser: true,
}

function firebaseResponse(url: string): Response | undefined {
  if (url.startsWith("https://identitytoolkit.googleapis.com/")) {
    return url.includes("accounts:lookup")
      ? Response.json({ users: [{ localId: "test-user", providerUserInfo: [] }] })
      : Response.json(authResponse)
  }
}

function mockUpstream(payload: unknown, status = 200) {
  const calls: { url: string; init: RequestInit | undefined }[] = []
  testFetch = async (input, init) => {
    if (String(input).endsWith("/integrity-mode")) {
      return Response.json({ schemaVersion: 1, integrityEnabled: false })
    }
    const auth = firebaseResponse(String(input))
    if (auth) return auth
    calls.push({ url: String(input), init })
    return calls.length === 1
      ? Response.json({ base: `${base}/` })
      : Response.json(payload, { status })
  }
  return calls
}

test("phone lookup posts v55 fields and returns only contact rows", async () => {
  const calls = mockUpstream({
    results: [
      { name: "Test business", phone: "00000000", source: "test" },
      { name: "Service message", phone: "Visit our website", link: "https://example.com" },
      { name: "Load more", showMore: true },
      { name: 42, phone: "00000000" },
      null,
    ],
    ad: {}, business: [], spam: [],
  })
  const before = Date.now()
  const response = await GET(new NextRequest("https://kaller.test/api/search?term=00000000&type=phone"))
  const after = Date.now()

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), [{ name: "Test business", phone: "00000000" }])
  assert.equal(calls.length, 2)
  assert.match(calls[0].url, /firebasestorage\.googleapis\.com\/v0\/b\/menodag-b32f3\.appspot\.com\/o\/configGoldNew\.txt\?alt=media$/)
  assert.equal(calls[1].url, `${base}/search`)
  assert.equal(calls[1].init?.method, "POST")
  assert.equal(calls[0].init?.redirect, "manual")
  assert.equal(calls[1].init?.redirect, "manual")
  assert.equal(calls[1].init?.cache, "no-store")
  const headers = new Headers(calls[1].init?.headers)
  assert.equal(headers.get("Content-Type"), "application/x-www-form-urlencoded")
  assert.equal(headers.get("Authorization"), "Bearer test-id-token")
  assert.equal(headers.get("User-Agent"), "iPhone CFNetwork Darwin IchIJe")
  const body = calls[1].init?.body
  assert.ok(body instanceof URLSearchParams)
  assert.equal(body.get("type"), "1")
  assert.equal(body.get("code"), "kw")
  assert.equal(body.get("lang"), "en")
  assert.equal(body.get("showSpam"), "0")
  assert.equal(body.get("version"), "29")
  const keyword = body.get("keyword")
  assert.ok(keyword)
  const midpoint = Math.floor(keyword.length / 2)
  const plaintext = Buffer.from(keyword.slice(midpoint) + keyword.slice(0, midpoint), "base64").toString("utf8")
  assert.ok(plaintext.startsWith("00000000validmenodagkeyword"))
  const timestamp = Number(plaintext.slice("00000000validmenodagkeyword".length))
  assert.ok(timestamp >= before && timestamp <= after)
})

test("name lookup preserves Arabic UTF-8 and form-sensitive characters", async () => {
  const calls = mockUpstream({ results: [] })
  const term = "اسم تجريبي + & = 😀"
  const response = await GET(new NextRequest(`https://kaller.test/api/search?${new URLSearchParams({ term, type: "name" })}`))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), [])
  const body = calls[1].init?.body
  assert.ok(body instanceof URLSearchParams)
  assert.equal(body.get("type"), "2")
  const keyword = body.get("keyword")
  assert.ok(keyword)
  const midpoint = Math.floor(keyword.length / 2)
  const plaintext = Buffer.from(keyword.slice(midpoint) + keyword.slice(0, midpoint), "base64").toString("utf8")
  assert.ok(plaintext.startsWith(`${term}validmenodagkeyword`))
})

test("name results retain service numbers and formatted international numbers", async () => {
  const results = [
    { name: "Test service", phone: "0000000" },
    { name: "Test international", phone: "+965 0000-0000" },
  ]
  mockUpstream({ results })
  const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), results)
})

test("concurrent searches reuse one anonymous sign-in", async () => {
  let signIns = 0
  let searches = 0
  testFetch = async (input) => {
    const url = String(input)
    if (url.endsWith("/integrity-mode")) return Response.json({ schemaVersion: 1, integrityEnabled: false })
    if (url.includes("accounts:signUp")) signIns++
    const auth = firebaseResponse(url)
    if (auth) return auth
    if (url.endsWith("/search")) {
      searches++
      return Response.json({ results: [] })
    }
    return Response.json({ base })
  }
  const responses = await Promise.all([
    GET(new NextRequest("https://kaller.test/api/search?term=first&type=name")),
    GET(new NextRequest("https://kaller.test/api/search?term=second&type=name")),
  ])
  assert.ok(responses.every((response) => response.status === 200))
  assert.equal(signIns, 1)
  assert.equal(searches, 2)
})

test("token refresh stops waiting when the request deadline expires", { timeout: 1000 }, async () => {
  mockUpstream({ results: [] })
  assert.equal((await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))).status, 200)
  const started = Promise.withResolvers<void>()
  const refreshed = Promise.withResolvers<Response>()
  const updated = Promise.withResolvers<void>()
  const unsubscribe = onIdTokenChanged(getAuth(getApp("menodag-search")), (user) => {
    if (user) void user.getIdToken().then((token) => {
      if (token === "refreshed-id-token") updated.resolve()
    })
  })
  testFetch = async (input) => {
    assert.ok(String(input).startsWith("https://securetoken.googleapis.com/"))
    started.resolve()
    return refreshed.promise
  }
  const controller = new AbortController()
  const pending = getSearchToken(true, controller.signal)
  await started.promise
  controller.abort(new Error("Request deadline expired"))
  await assert.rejects(pending, /Request deadline expired/)
  refreshed.resolve(Response.json({ access_token: "refreshed-id-token", refresh_token: "new-refresh-token", expires_in: "3600" }))
  await updated.promise
  unsubscribe()
})

test("a 401 refreshes the Firebase token and retries search only once", async () => {
  for (const finalStatus of [200, 401]) {
    await signOut(getAuth(getApp("menodag-search")))
    const tokens: (string | null)[] = []
    let refreshes = 0
    testFetch = async (input, init) => {
      const url = String(input)
      if (url.endsWith("/integrity-mode")) return Response.json({ schemaVersion: 1, integrityEnabled: false })
      const auth = firebaseResponse(url)
      if (auth) return auth
      if (url.startsWith("https://securetoken.googleapis.com/")) {
        refreshes++
        return Response.json({ access_token: "refreshed-id-token", refresh_token: "new-refresh-token", expires_in: "3600", user_id: "test-user" })
      }
      if (url.endsWith("/search")) {
        tokens.push(new Headers(init?.headers).get("Authorization"))
        return Response.json({ results: [] }, { status: tokens.length === 1 ? 401 : finalStatus })
      }
      if (url.endsWith("/names")) {
        assert.equal(new Headers(init?.headers).get("Authorization"), null)
        return Response.json({ results: [] })
      }
      return Response.json({ base })
    }
    const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
    assert.equal(response.status, 200, JSON.stringify(await response.clone().json()))
    assert.deepEqual(tokens, ["Bearer test-id-token", "Bearer refreshed-id-token"])
    assert.equal(refreshes, 1)
  }
})

test("failed authentication uses the documented legacy route", async () => {
  let searches = 0
  let legacy = 0
  testFetch = async (input) => {
    const url = String(input)
    if (url.endsWith("/integrity-mode")) return Response.json({ schemaVersion: 1, integrityEnabled: false })
    if (url.startsWith("https://identitytoolkit.googleapis.com/")) {
      return Response.json({ error: { message: "OPERATION_NOT_ALLOWED" } }, { status: 400 })
    }
    if (url.endsWith("/search")) searches++
    if (url.endsWith("/names")) {
      legacy++
      return Response.json({ results: [] })
    }
    return Response.json({ base })
  }
  const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
  assert.equal(response.status, 200)
  assert.equal(searches, 0)
  assert.equal(legacy, 1)
})

test("unavailable app verification selects legacy without minting identities", async () => {
  for (const mode of [true, null]) {
    const requests: string[] = []
    testFetch = async (input, init) => {
      const url = String(input)
      requests.push(url)
      if (url.endsWith("/integrity-mode")) {
        return mode === null
          ? Response.json({ error: "Unavailable" }, { status: 503 })
          : Response.json({ schemaVersion: 1, integrityEnabled: mode })
      }
      if (url.endsWith("/names")) {
        assert.equal(new Headers(init?.headers).get("Authorization"), null)
        return Response.json({ results: [] })
      }
      assert.ok(url.startsWith("https://firebasestorage.googleapis.com/"))
      return Response.json({ base })
    }
    const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
    assert.equal(response.status, 200)
    assert.equal(requests.length, 3)
    assert.ok(requests[2].endsWith("/names"))
  }
})

test("a changed integrity mode is read again after a 401", async () => {
  let modes = 0
  const paths: string[] = []
  testFetch = async (input) => {
    const url = String(input)
    const auth = firebaseResponse(url)
    if (auth) return auth
    if (url.endsWith("/integrity-mode")) {
      modes++
      return Response.json({ schemaVersion: 1, integrityEnabled: modes > 1 })
    }
    if (url.endsWith("/search") || url.endsWith("/names")) {
      paths.push(new URL(url).pathname)
      return Response.json({ results: [] }, { status: url.endsWith("/search") ? 401 : 200 })
    }
    return Response.json({ base })
  }
  const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
  assert.equal(response.status, 200)
  assert.equal(modes, 2)
  assert.deepEqual(paths, ["/stage/search", "/stage/names"])
})

test("a rejected legacy fallback stops after one attempt", async () => {
  let legacy = 0
  testFetch = async (input) => {
    const url = String(input)
    if (url.endsWith("/integrity-mode")) return Response.json({ schemaVersion: 1, integrityEnabled: true })
    if (url.endsWith("/names")) {
      legacy++
      return Response.json({ message: "Forbidden" }, { status: 403 })
    }
    return Response.json({ base })
  }
  const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
  assert.equal(response.status, 403)
  assert.equal(legacy, 1)
})

test("a config outage uses the last validated base", async () => {
  mockUpstream({ results: [] })
  assert.equal((await getConfig()).status, 200)
  for (const failure of ["network", "server"]) {
    testFetch = async (input) => {
      const url = String(input)
      if (url.startsWith("https://firebasestorage.googleapis.com/")) {
        if (failure === "network") throw new TypeError("Connection failed")
        return Response.json({ error: "Unavailable" }, { status: 503 })
      }
      if (url.endsWith("/integrity-mode")) return Response.json({ schemaVersion: 1, integrityEnabled: true })
      assert.equal(url, `${base}/names`)
      return Response.json({ results: [{ name: "Test business", phone: "00000000" }] })
    }
    const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), [{ name: "Test business", phone: "00000000" }])
  }
})

test("config access denial does not use cached configuration", async () => {
  testFetch = async () => Response.json({ error: "Forbidden" }, { status: 403 })
  const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
  assert.equal(response.status, 502)
})

test("an independently configured encrypted backup serves a rejected primary", async () => {
  process.env.AES_KEY = "0123456789abcdef"
  process.env.FIREBASE_URL = "https://backup-config.test"
  let backupCalls = 0
  testFetch = async (input, init) => {
    const url = new URL(String(input))
    if (url.hostname === "backup-config.test") return Response.json({ base: "https://backup-api.test/v1/" })
    if (url.hostname === "backup-api.test") {
      backupCalls++
      assert.equal(init?.redirect, "manual")
      assert.equal(new Headers(init?.headers).get("Authorization"), null)
      const code = url.searchParams.get("code")
      assert.ok(code)
      const key = CryptoJS.enc.Utf8.parse("0123456789abcdef")
      const decoded = CryptoJS.AES.decrypt(code.replace(/-/g, "+").replace(/AaAaAa/g, "="), key, {
        mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7,
      }).toString(CryptoJS.enc.Utf8)
      assert.equal(decoded, "123term=00000000&234opt=1&234limit=100&234slt=123")
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify([
        { name: "Test business", phone: "0000XXXX" },
        { name: "Different prefix", phone: "1111XXXX" },
      ]), key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }).toString()
      return new Response(encrypted.replace(/\+/g, "-").replace(/=/g, "AaAaAa"))
    }
    if (url.pathname.endsWith("/integrity-mode")) return Response.json({ schemaVersion: 1, integrityEnabled: true })
    if (url.pathname.endsWith("/names")) return Response.json({ message: "Forbidden" }, { status: 403 })
    return Response.json({ base })
  }
  const response = await GET(new NextRequest("https://kaller.test/api/search?term=00000000&type=phone"))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), [{ name: "Test business", phone: "00000000" }])
  assert.equal(backupCalls, 1)
})

test("encrypted name searches never fill in masked phone numbers", async () => {
  process.env.AES_KEY = "0123456789abcdef"
  process.env.FIREBASE_URL = "https://backup-config.test"
  testFetch = async (input) => {
    if (String(input).startsWith("https://backup-config.test/")) return Response.json({ base: "https://backup-api.test/v1" })
    const key = CryptoJS.enc.Utf8.parse("0123456789abcdef")
    const code = new URL(String(input)).searchParams.get("code")
    assert.ok(code)
    const decoded = CryptoJS.AES.decrypt(code.replace(/-/g, "+").replace(/AaAaAa/g, "="), key, {
      mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7,
    }).toString(CryptoJS.enc.Utf8)
    assert.equal(decoded, "123term=Test business&234opt=2&234limit=100&234slt=123")
    return new Response(CryptoJS.AES.encrypt(JSON.stringify([
      { name: "Test masked", phone: "0000XXXX" },
      { name: "Test full", phone: "00000000" },
    ]), key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }).toString())
  }
  const results = await searchConfiguredBackup("Test business", "name", AbortSignal.timeout(1000))
  assert.deepEqual(results, [{ name: "Test full", phone: "00000000" }])
})

test("encrypted backup rejects query parameter separators", async () => {
  process.env.AES_KEY = "0123456789abcdef"
  process.env.FIREBASE_URL = "https://backup-config.test"
  await assert.rejects(searchConfiguredBackup("Test&234opt=0", "name", AbortSignal.timeout(1000)), /unsupported separator/)
})

test("backup rate limits are preserved instead of becoming primary access errors", async () => {
  process.env.AES_KEY = "0123456789abcdef"
  process.env.FIREBASE_URL = "https://backup-config.test"
  for (const stage of ["config", "search"]) {
    let backupCalls = 0
    testFetch = async (input) => {
      const url = new URL(String(input))
      if (url.hostname === "backup-config.test") {
        return stage === "config" ? new Response(null, { status: 429 }) : Response.json({ base: "https://backup-api.test/v1" })
      }
      if (url.hostname === "backup-api.test") {
        backupCalls++
        return new Response(null, { status: 429 })
      }
      if (url.pathname.endsWith("/integrity-mode")) return Response.json({ schemaVersion: 1, integrityEnabled: true })
      if (url.pathname.endsWith("/names")) return new Response(null, { status: 403 })
      return Response.json({ base })
    }
    const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
    assert.equal(response.status, 429)
    assert.equal(backupCalls, stage === "search" ? 1 : 0)
  }
})

test("configured backup is not used on primary success or rate limiting", async () => {
  process.env.AES_KEY = "0123456789abcdef"
  process.env.FIREBASE_URL = "https://backup-config.test"
  for (const status of [200, 429]) {
    const calls = mockUpstream({ results: [] }, status)
    const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
    assert.equal(response.status, status)
    assert.equal(calls.length, 2)
  }
})

test("an invalid encrypted backup response is not an empty successful lookup", async () => {
  process.env.AES_KEY = "0123456789abcdef"
  process.env.FIREBASE_URL = "https://backup-config.test"
  let backupCalls = 0
  testFetch = async (input) => {
    const url = new URL(String(input))
    if (url.hostname === "backup-config.test") return Response.json({ base: "https://backup-api.test/v1" })
    if (url.hostname === "backup-api.test") {
      backupCalls++
      return new Response("invalid ciphertext")
    }
    if (url.pathname.endsWith("/integrity-mode")) return Response.json({ schemaVersion: 1, integrityEnabled: true })
    if (url.pathname.endsWith("/names")) return Response.json({ message: "Forbidden" }, { status: 403 })
    return Response.json({ base })
  }
  const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
  assert.equal(response.status, 403)
  assert.equal(backupCalls, 1)
})

test("missing terms and unknown search types fail before fetching", async () => {
  const calls = mockUpstream({ results: [] })
  for (const query of ["", "term=%20%20", "term=test&type=unknown"]) {
    const response = await GET(new NextRequest(`https://kaller.test/api/search?${query}`))
    assert.equal(response.status, 400)
  }
  assert.equal(calls.length, 0)
})

test("upstream access and rate-limit failures remain errors", async () => {
  for (const status of [403, 429, 503]) {
    const calls = mockUpstream({ message: "upstream error" }, status)
    const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), { error: `Search service returned ${status}` })
    assert.equal(calls.length, 2)
  }
})

test("search redirects are rejected instead of forwarded", async () => {
  mockUpstream({ results: [] }, 302)
  const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), { error: "Search service returned 302" })
})

test("configuration redirects stop before the search request", async () => {
  let calls = 0
  testFetch = async (_input, init) => {
    calls++
    assert.equal(init?.redirect, "manual")
    return new Response(null, { status: 302, headers: { Location: "https://example.com" } })
  }
  const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
  assert.equal(response.status, 502)
  assert.equal(calls, 1)
})

test("invalid success payloads do not become empty search results", async () => {
  for (const payload of [null, [], {}, { results: "invalid" }]) {
    mockUpstream(payload)
    const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
    assert.equal(response.status, 502)
    assert.deepEqual(await response.json(), { error: "Invalid search response" })
  }
})

test("configuration failures stop the search", async () => {
  for (const config of [{}, { base: "http://example.com/stage" }, { base: "https://user:pass@example.com/stage" }]) {
    let calls = 0
    testFetch = async () => {
      calls++
      return Response.json(config)
    }
    const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
    assert.equal(response.status, 502)
    assert.equal(calls, 1)
  }
})

test("config endpoint reports the same Storage configuration used by search", async () => {
  mockUpstream({ results: [] })
  const response = await getConfig()
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { base })
})
