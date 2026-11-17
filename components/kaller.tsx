"use client"

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { search } from "@/lib/api"
import type { SearchResult } from "@/lib/config"
import { readQuery, type Query } from "@/lib/phone"
import { Backdrop } from "./backdrop"
import { ArrowIcon, CloseIcon } from "./icons"
import { Results } from "./results"
import { Tools } from "./tools"

const UNLOCK_TAPS = 5
const TAP_GAP_MS = 600

interface Found {
  query: Query
  results: SearchResult[]
}

export function Kaller() {
  const [value, setValue] = useState("")
  const [found, setFound] = useState<Found | null>(null)
  const [searches, setSearches] = useState(0)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState("")
  const [unlocked, setUnlocked] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const pending = useRef<AbortController | null>(null)
  const taps = useRef({ count: 0, last: 0 })

  async function run(input: string) {
    const query = readQuery(input)
    if (!query) return
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setSearching(true)
    setError("")
    try {
      const results = await search(query.term, query.kind, controller.signal)
      setFound({ query, results })
      setSearches((count) => count + 1)
    } catch (caught) {
      if (controller.signal.aborted) return
      setFound(null)
      setError(caught instanceof Error ? caught.message : "Search failed")
    } finally {
      if (pending.current === controller) {
        pending.current = null
        setSearching(false)
      }
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void run(value)
  }

  function reset() {
    pending.current?.abort()
    pending.current = null
    setValue("")
    setFound(null)
    setError("")
    setSearching(false)
    inputRef.current?.focus()
  }

  function escape(event: KeyboardEvent) {
    if (event.key === "Escape") reset()
  }

  function tapWordmark() {
    const now = Date.now()
    const tap = taps.current
    tap.count = now - tap.last < TAP_GAP_MS ? tap.count + 1 : 1
    tap.last = now
    if (tap.count >= UNLOCK_TAPS) setUnlocked(true)
  }

  return (
    <>
      <Backdrop origin={formRef} quiet={contentRef} searching={searching} found={searches} />
      <header className="top">
        <h1 className="wordmark" onClick={tapWordmark}>Kaller</h1>
      </header>
      <main className={found || error ? "stage active" : "stage"}>
        <form ref={formRef} className={searching ? "lookup busy" : "lookup"} role="search" onSubmit={submit}>
          <input
            ref={inputRef}
            className="lookup-field"
            type="text"
            inputMode="text"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus
            dir="auto"
            placeholder="Number or name"
            aria-label="Number or name"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onPaste={() => setTimeout(() => formRef.current?.requestSubmit())}
            onKeyDown={escape}
          />
          {(value || found) && (
            <button className="clear" type="button" aria-label="Clear" onClick={reset}>
              <CloseIcon />
            </button>
          )}
          <button className="go" type="submit" aria-label="Look up" disabled={searching}>
            {searching ? <span className="spinner" /> : <ArrowIcon />}
          </button>
        </form>
        <p className="error" role="alert">{error}</p>
        <div ref={contentRef}>
          {found && (
            <div className={searching ? "found stale" : "found"}>
              <Results key={searches} query={found.query} results={found.results} />
            </div>
          )}
          {unlocked && <Tools />}
        </div>
      </main>
    </>
  )
}
