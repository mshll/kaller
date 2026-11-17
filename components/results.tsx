"use client"

import { useState, type CSSProperties } from "react"
import type { SearchResult } from "@/lib/config"
import { callUrl, formatPhone, whatsAppUrl, type Query } from "@/lib/phone"
import { CheckIcon, CopyIcon, PhoneIcon, WhatsAppIcon } from "./icons"

const PAGE_SIZE = 30
const ROW_STAGGER_MS = 25
const COPIED_MS = 1400

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString("en")} ${count === 1 ? one : many}`
}

export function Results({ query, results }: { query: Query; results: SearchResult[] }) {
  const [shown, setShown] = useState(PAGE_SIZE)
  const subject = query.kind === "phone" ? formatPhone(query.term) : `“${query.term}”`

  if (results.length === 0) {
    return (
      <p className="empty">
        {query.kind === "phone" ? `No name listed for ${subject}.` : `No one listed as ${subject}.`}
      </p>
    )
  }

  const remaining = results.length - shown

  return (
    <section aria-label="Results">
      <p className="summary">
        {plural(results.length, query.kind === "phone" ? "name" : "match", query.kind === "phone" ? "names" : "matches")}
        {" for "}
        <span className="subject" dir="auto">{subject}</span>
      </p>
      <div className="card">
        <ul className="rows">
          {results.slice(0, shown).map((result, index) => (
            <Row key={`${result.phone}-${index}`} result={result} order={index % PAGE_SIZE} />
          ))}
        </ul>
        {remaining > 0 && (
          <button className="more" type="button" onClick={() => setShown(shown + PAGE_SIZE)}>
            Show {Math.min(remaining, PAGE_SIZE)} more
          </button>
        )}
      </div>
    </section>
  )
}

function Row({ result, order }: { result: SearchResult; order: number }) {
  const [copied, setCopied] = useState(false)
  const number = formatPhone(result.phone)

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.phone)
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_MS)
    } catch (error) {
      console.error("Copy failed", error)
    }
  }

  return (
    <li className="row" style={{ "--order": order, "--stagger": `${ROW_STAGGER_MS}ms` } as CSSProperties}>
      <div className="who">
        <p className="name" dir="auto">{result.name}</p>
        <p className="number">{number}</p>
      </div>
      <div className="actions">
        <button
          className="act"
          type="button"
          onClick={copy}
          aria-label={copied ? `Copied ${number}` : `Copy ${number}`}
          data-done={copied || undefined}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
        <a className="act" href={callUrl(result.phone)} aria-label={`Call ${number}`}>
          <PhoneIcon />
        </a>
        <a
          className="act"
          href={whatsAppUrl(result.phone)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp ${number}`}
        >
          <WhatsAppIcon />
        </a>
      </div>
    </li>
  )
}
