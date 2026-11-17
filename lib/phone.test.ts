import { test } from "node:test"
import assert from "node:assert/strict"
import { callUrl, formatPhone, readQuery, whatsAppUrl } from "./phone"

test("digits read as a phone search", () => {
  assert.deepEqual(readQuery(" 9999 1234 "), { term: "99991234", kind: "phone" })
})

test("Kuwait country code is dropped from a full number", () => {
  assert.deepEqual(readQuery("+965 9999-1234"), { term: "99991234", kind: "phone" })
  assert.deepEqual(readQuery("00965 99991234"), { term: "99991234", kind: "phone" })
})

test("a number that only starts with 965 keeps its digits", () => {
  assert.deepEqual(readQuery("96512"), { term: "96512", kind: "phone" })
})

test("letters read as a name search with spaces collapsed", () => {
  assert.deepEqual(readQuery("  Ahmad   Al Enezi "), { term: "Ahmad Al Enezi", kind: "name" })
  assert.deepEqual(readQuery("محمد"), { term: "محمد", kind: "name" })
})

test("empty or punctuation-only input is no query", () => {
  assert.equal(readQuery("   "), null)
  assert.equal(readQuery("+ -"), null)
})

test("local numbers format in two groups of four", () => {
  assert.equal(formatPhone("+96599991234"), "9999 1234")
  assert.equal(formatPhone("123456"), "123456")
})

test("call and WhatsApp links carry the country code", () => {
  assert.equal(callUrl("9999 1234"), "tel:+96599991234")
  assert.equal(whatsAppUrl("0096599991234"), "https://wa.me/96599991234")
  assert.equal(whatsAppUrl("+44 7700 900123"), "https://wa.me/447700900123")
})
