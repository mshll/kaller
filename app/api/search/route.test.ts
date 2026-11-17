import { afterEach, test } from "node:test"
import assert from "node:assert/strict"
import { NextRequest } from "next/server"
import { GET } from "./route"
import { GET as getConfig } from "../config/route"

const originalFetch = globalThis.fetch
const base = "https://example.execute-api.ca-central-1.amazonaws.com/stage"

afterEach(() => {
  globalThis.fetch = originalFetch
})

function mockUpstream(payload: unknown, status = 200) {
  const calls: { url: string; init: RequestInit | undefined }[] = []
  globalThis.fetch = async (input, init) => {
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
  assert.equal(calls[1].url, `${base}/names`)
  assert.equal(calls[1].init?.method, "POST")
  assert.equal(calls[0].init?.redirect, "manual")
  assert.equal(calls[1].init?.redirect, "manual")
  assert.equal(calls[1].init?.cache, "no-store")
  const headers = new Headers(calls[1].init?.headers)
  assert.equal(headers.get("Content-Type"), "application/x-www-form-urlencoded")
  assert.equal(headers.get("Authorization"), null)
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
    mockUpstream({ message: "upstream error" }, status)
    const response = await GET(new NextRequest("https://kaller.test/api/search?term=test&type=name"))
    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), { error: `Search service returned ${status}` })
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
  globalThis.fetch = async (_input, init) => {
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
    globalThis.fetch = async () => {
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
