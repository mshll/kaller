import type { SearchType } from "./config"

export interface Query {
  term: string
  kind: SearchType
}

const COUNTRY_CODE = "965"
const LOCAL_LENGTH = 8

function localDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  for (const prefix of [`00${COUNTRY_CODE}`, COUNTRY_CODE]) {
    if (digits.length === prefix.length + LOCAL_LENGTH && digits.startsWith(prefix)) {
      return digits.slice(prefix.length)
    }
  }
  return digits
}

export function readQuery(input: string): Query | null {
  const value = input.trim().replace(/\s+/g, " ")
  if (!value) return null
  if (!/^[+\d\s()-]+$/.test(value)) return { term: value, kind: "name" }
  const digits = localDigits(value)
  return digits ? { term: digits, kind: "phone" } : null
}

export function formatPhone(phone: string): string {
  const digits = localDigits(phone)
  return digits.length === LOCAL_LENGTH ? `${digits.slice(0, 4)} ${digits.slice(4)}` : phone
}

export function callUrl(phone: string): string {
  const digits = localDigits(phone)
  return digits.length === LOCAL_LENGTH ? `tel:+${COUNTRY_CODE}${digits}` : `tel:${digits}`
}

export function whatsAppUrl(phone: string): string {
  const digits = localDigits(phone)
  return `https://wa.me/${digits.length === LOCAL_LENGTH ? COUNTRY_CODE + digits : digits}`
}
