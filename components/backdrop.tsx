"use client"

import { useEffect, useRef, type RefObject } from "react"

const SPACING = 22
const DOT_RADIUS = 1.15
const SPRITE_SIZE = 32
const SPEED = 0.24
const BAND = 46
const IDLE_EVERY_MS = 4200
const SEARCH_EVERY_MS = 850
const IDLE_FRAME_MS = 1000 / 30
const IDLE_STRENGTH = 0.5
const SEARCH_STRENGTH = 0.9
const FOUND_STRENGTH = 1.4
const PUSH = 3.5
const QUIET_FADE = 28

interface Wave {
  born: number
  strength: number
}

function sprite(color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = SPRITE_SIZE
  const context = canvas.getContext("2d")
  if (context) {
    context.fillStyle = color
    context.beginPath()
    context.arc(SPRITE_SIZE / 2, SPRITE_SIZE / 2, SPRITE_SIZE / 2, 0, Math.PI * 2)
    context.fill()
  }
  return canvas
}

export function Backdrop({
  origin,
  quiet,
  searching,
  found,
}: {
  origin: RefObject<HTMLElement | null>
  quiet: RefObject<HTMLElement | null>
  searching: boolean
  found: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const live = useRef({ searching, waves: [] as Wave[] })

  useEffect(() => {
    live.current.searching = searching
  }, [searching])

  useEffect(() => {
    if (found) live.current.waves.push({ born: performance.now(), strength: FOUND_STRENGTH })
  }, [found])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return
    const still = matchMedia("(prefers-reduced-motion: reduce)")
    const dark = matchMedia("(prefers-color-scheme: dark)")
    const waves = live.current.waves
    let width = 0
    let height = 0
    let ink = sprite("#000")
    let signal = sprite("#000")
    let frame = 0
    let drawn = 0
    let spawned = -Infinity

    function paint() {
      const styles = getComputedStyle(document.documentElement)
      ink = sprite(styles.getPropertyValue("--fg").trim())
      signal = sprite(styles.getPropertyValue("--signal-ink").trim())
    }

    function resize() {
      const ratio = Math.min(devicePixelRatio || 1, 2)
      width = innerWidth
      height = innerHeight
      canvas!.width = Math.round(width * ratio)
      canvas!.height = Math.round(height * ratio)
      context!.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    function center() {
      const box = origin.current?.getBoundingClientRect()
      return box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : { x: width / 2, y: height / 2 }
    }

    function draw(now: number) {
      const { x: originX, y: originY } = center()
      const reach = Math.hypot(Math.max(originX, width - originX), Math.max(originY, height - originY))
      for (let i = waves.length - 1; i >= 0; i--) {
        if ((now - waves[i].born) * SPEED - BAND * 3 > reach) waves.splice(i, 1)
      }
      const hush = quiet.current?.getBoundingClientRect()
      const radii = waves.map((wave) => (now - wave.born) * SPEED)
      context!.clearRect(0, 0, width, height)
      for (let y = (height % SPACING) / 2; y < height; y += SPACING) {
        for (let x = (width % SPACING) / 2; x < width; x += SPACING) {
          const inside = hush && hush.height > 0
            ? Math.min(x - hush.left, hush.right - x, y - hush.top, hush.bottom - y) + QUIET_FADE / 2
            : 0
          const open = inside > 0 ? Math.max(0, 1 - inside / QUIET_FADE) : 1
          if (open === 0) continue
          const dx = x - originX
          const dy = y - originY
          const distance = Math.hypot(dx, dy) || 1
          let lift = 0
          for (let i = 0; i < waves.length; i++) {
            const offset = (distance - radii[i]) / BAND
            if (offset > -3 && offset < 3) {
              lift += waves[i].strength * Math.exp(-offset * offset) * Math.max(0, 1 - radii[i] / reach)
            }
          }
          const near = Math.max(0, 1 - distance / reach)
          const push = lift * PUSH
          const px = x + (dx / distance) * push
          const py = y + (dy / distance) * push
          context!.globalAlpha = (0.06 + 0.1 * near * near) * open
          context!.drawImage(ink, px - DOT_RADIUS, py - DOT_RADIUS, DOT_RADIUS * 2, DOT_RADIUS * 2)
          if (lift > 0.02) {
            const radius = DOT_RADIUS * (1 + lift * 0.8)
            context!.globalAlpha = Math.min(1, lift) * 0.85 * open
            context!.drawImage(signal, px - radius, py - radius, radius * 2, radius * 2)
          }
        }
      }
      context!.globalAlpha = 1
    }

    function tick(now: number) {
      frame = requestAnimationFrame(tick)
      const { searching } = live.current
      if (now - spawned > (searching ? SEARCH_EVERY_MS : IDLE_EVERY_MS)) {
        waves.push({ born: now, strength: searching ? SEARCH_STRENGTH : IDLE_STRENGTH })
        spawned = now
      }
      if (!searching && now - drawn < IDLE_FRAME_MS) return
      drawn = now
      draw(now)
    }

    function restart() {
      cancelAnimationFrame(frame)
      resize()
      paint()
      waves.length = 0
      if (still.matches) draw(0)
      else frame = requestAnimationFrame(tick)
    }

    function redraw() {
      resize()
      if (still.matches) draw(0)
    }

    function recolor() {
      paint()
      if (still.matches) draw(0)
    }

    restart()
    addEventListener("resize", redraw)
    dark.addEventListener("change", recolor)
    still.addEventListener("change", restart)
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener("resize", redraw)
      dark.removeEventListener("change", recolor)
      still.removeEventListener("change", restart)
    }
  }, [origin, quiet])

  return <canvas ref={canvasRef} className="backdrop" aria-hidden="true" />
}
