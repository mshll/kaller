"use client"

import { useState, type FormEvent } from "react"
import { getConfig, requestBlock, sendVerification } from "@/lib/api"
import type { FirebaseConfig } from "@/lib/config"

interface Reply {
  ok: boolean
  text: string
}

function failure(error: unknown, fallback: string): Reply {
  return { ok: false, text: error instanceof Error ? error.message : fallback }
}

export function Tools() {
  return (
    <section className="tools" aria-labelledby="tools-title">
      <h2 id="tools-title" className="tools-title">Tools</h2>
      <div className="card">
        <PhoneAction label="Send a verification SMS" verb="Send" run={sendVerification} />
        <PhoneAction label="Request a block" verb="Block" run={requestBlock} danger />
        <ConfigView />
      </div>
    </section>
  )
}

function PhoneAction({
  label,
  verb,
  run,
  danger = false,
}: {
  label: string
  verb: string
  run: (phone: string) => Promise<string>
  danger?: boolean
}) {
  const [phone, setPhone] = useState("")
  const [busy, setBusy] = useState(false)
  const [reply, setReply] = useState<Reply | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!phone.trim()) return
    setBusy(true)
    setReply(null)
    try {
      setReply({ ok: true, text: (await run(phone.trim())) || "Sent." })
    } catch (error) {
      setReply(failure(error, `${verb} failed`))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="tool" onSubmit={submit}>
      <label className="tool-label" htmlFor={`tool-${verb}`}>{label}</label>
      <div className="tool-row">
        <input
          id={`tool-${verb}`}
          className="tool-field"
          type="tel"
          inputMode="tel"
          enterKeyHint="send"
          autoComplete="off"
          placeholder="Phone number"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <button className="tool-button" type="submit" disabled={busy} data-danger={danger || undefined}>
          {busy ? <span className="spinner" aria-label="Working" /> : verb}
        </button>
      </div>
      {reply && <p className={reply.ok ? "tool-reply" : "tool-reply failed"} role="status">{reply.text}</p>}
    </form>
  )
}

function mask(value: string): string {
  return value.length <= 8 ? "••••••••" : `${value.slice(0, 4)}••••${value.slice(-4)}`
}

function ConfigView() {
  const [config, setConfig] = useState<FirebaseConfig | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [reveal, setReveal] = useState(false)

  async function load() {
    setBusy(true)
    setError("")
    try {
      setConfig(await getConfig())
    } catch (caught) {
      setError(failure(caught, "Config failed to load").text)
    } finally {
      setBusy(false)
    }
  }

  const entries = config && [
    { label: "API base", value: config.base, secret: false },
    { label: "Stripe public key", value: config.stripe_pub_key, secret: true },
    { label: "Stripe secret key", value: config.stripe_sec_key, secret: true },
    { label: "Currency", value: config.stripe_currency?.toUpperCase(), secret: false },
    {
      label: "Price",
      value: config.stripe_price === undefined ? undefined : `${(config.stripe_price / 100).toFixed(2)}`,
      secret: false,
    },
  ]

  return (
    <div className="tool">
      <div className="tool-head">
        <span className="tool-label">API config</span>
        {entries ? (
          <button className="link" type="button" onClick={() => setReveal(!reveal)}>
            {reveal ? "Hide keys" : "Show keys"}
          </button>
        ) : (
          <button className="link" type="button" onClick={load} disabled={busy}>
            {busy ? "Loading…" : "Load"}
          </button>
        )}
      </div>
      {error && <p className="tool-reply failed" role="alert">{error}</p>}
      {entries && (
        <dl className="config">
          {entries.map(({ label, value, secret }) => (
            <div key={label} className="config-row">
              <dt>{label}</dt>
              <dd>{value ? (secret && !reveal ? mask(value) : value) : "Not set"}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
