"use client"

import { useEffect, useRef } from "react"

const OUTLINES = [
  [[0, 372], [435, 782], [870, 372], [870, 89], [435, 499], [0, 89]],
  [[0, 782], [299, 782], [0, 500]],
  [[870, 782], [870, 500], [571, 782]],
]
const CAPS = [[[0, 1, 4, 5], [1, 2, 3, 4]], [[0, 1, 2]], [[0, 1, 2]]]
const HALF = 435
const DEPTH = 0.2
const BEVEL = 0.045
const SIZE = 44
const IDLE = 0.5
const DECAY = 2.6
const KICK = Math.PI * 2 * DECAY
const TOP_SPEED = KICK * 3

const VERTEX = `
attribute vec3 position;
attribute vec3 normal;
uniform float turn;
varying vec3 facing;
varying vec3 place;
varying vec3 local;
vec3 spin(vec3 v) {
  float c = cos(turn);
  float s = sin(turn);
  return vec3(v.x * c + v.z * s, v.y, v.z * c - v.x * s);
}
void main() {
  local = position;
  place = spin(position);
  facing = spin(normal);
  float far = (4.0 - place.z) / 4.0;
  gl_Position = vec4(place.xy * 0.6, -place.z * 0.25 * far, far);
}`

const FRAGMENT = `
precision mediump float;
uniform vec3 tint;
varying vec3 facing;
varying vec3 place;
varying vec3 local;
float hash(float v) {
  return fract(sin(v * 127.1) * 43758.5453);
}
float brushed(vec3 p) {
  float line = p.y * 46.0 + sin(p.x * 2.3) * 1.5;
  return mix(hash(floor(line)), hash(floor(line) + 1.0), smoothstep(0.0, 1.0, fract(line)));
}
vec3 studio(vec3 r) {
  vec3 c = mix(vec3(0.5, 0.51, 0.54), vec3(1.0), smoothstep(-0.35, 0.5, r.y));
  c += vec3(0.5) * smoothstep(0.06, 0.0, abs(r.y - 0.05));
  c += vec3(0.6) * pow(max(dot(r, normalize(vec3(-0.6, 0.5, 0.62))), 0.0), 30.0);
  return c;
}
void main() {
  vec3 n = normalize(facing);
  vec3 eye = normalize(vec3(0.0, 0.0, 4.0) - place);
  vec3 key = normalize(vec3(-0.35, 0.55, 0.9));
  float light = 0.62 + 0.38 * max(dot(n, key), 0.0);
  float edge = pow(1.0 - max(dot(n, eye), 0.0), 2.0);
  vec3 metal = studio(reflect(-eye, n));
  vec3 c = vec3(0.93, 0.935, 0.95) * light * mix(0.86, 1.0, metal.r) + (brushed(local) - 0.5) * 0.07;
  c = mix(c, metal, 0.22 + 0.3 * edge);
  float shine = smoothstep(0.9, 1.25, metal.r + edge * 0.3);
  gl_FragColor = vec4(mix(min(c, 1.0) * tint, vec3(1.0), shine * 0.45), 1.0);
}`

type Point = [number, number]

function signalColor(): Vector {
  const hex = getComputedStyle(document.documentElement).getPropertyValue("--signal-ink").trim().replace("#", "")
  return [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255) as Vector
}
type Vector = [number, number, number]

function mesh(): Float32Array {
  const out: number[] = []
  const triangle = (a: Vector, b: Vector, c: Vector, n: Vector) => out.push(...a, ...n, ...b, ...n, ...c, ...n)
  const quad = (a: Vector, b: Vector, c: Vector, d: Vector, n: Vector) => {
    triangle(a, b, c, n)
    triangle(a, c, d, n)
  }
  OUTLINES.forEach((outline, shape) => {
    const rim: Point[] = outline.map(([x, y]) => [(x - HALF) / HALF, (HALF - y) / HALF])
    const count = rim.length
    const outward: Point[] = rim.map(([x, y], i) => {
      const [nextX, nextY] = rim[(i + 1) % count]
      const length = Math.hypot(nextX - x, nextY - y)
      return [(nextY - y) / length, (x - nextX) / length]
    })
    const inset: Point[] = rim.map(([x, y], i) => {
      const [ax, ay] = outward[(i + count - 1) % count]
      const [bx, by] = outward[i]
      const reach = BEVEL / (1 + ax * bx + ay * by)
      return [x - (ax + bx) * reach, y - (ay + by) * reach]
    })
    for (const side of [1, -1]) {
      const face = DEPTH * side
      const shoulder = (DEPTH - BEVEL) * side
      for (const part of CAPS[shape]) {
        for (let i = 1; i < part.length - 1; i++) {
          triangle([...inset[part[0]], face], [...inset[part[i]], face], [...inset[part[i + 1]], face], [0, 0, side])
        }
      }
      for (let i = 0; i < count; i++) {
        const j = (i + 1) % count
        const [nx, ny] = outward[i]
        quad([...inset[i], face], [...inset[j], face], [...rim[j], shoulder], [...rim[i], shoulder],
          [nx * Math.SQRT1_2, ny * Math.SQRT1_2, side * Math.SQRT1_2])
      }
    }
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count
      const edge = DEPTH - BEVEL
      quad([...rim[i], edge], [...rim[j], edge], [...rim[j], -edge], [...rim[i], -edge], [...outward[i], 0])
    }
  })
  return new Float32Array(out)
}

function spin(link: HTMLAnchorElement, canvas: HTMLCanvasElement): (() => void) | undefined {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches
  const ratio = Math.min(devicePixelRatio || 1, 3)
  canvas.width = canvas.height = SIZE * ratio
  const gl = canvas.getContext("webgl", { antialias: true })
  if (!gl) return
  const program = gl.createProgram()
  for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
    const shader = gl.createShader(type)
    if (!shader) return
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    gl.attachShader(program, shader)
  }
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
  gl.useProgram(program)
  const vertices = mesh()
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
  for (const [name, offset] of [["position", 0], ["normal", 12]] as const) {
    const slot = gl.getAttribLocation(program, name)
    gl.enableVertexAttribArray(slot)
    gl.vertexAttribPointer(slot, 3, gl.FLOAT, false, 24, offset)
  }
  const turn = gl.getUniformLocation(program, "turn")
  const tint = gl.getUniformLocation(program, "tint")
  const dark = matchMedia("(prefers-color-scheme: dark)")
  let color = signalColor()
  const recolor = () => {
    color = signalColor()
    if (still) requestAnimationFrame(draw)
  }
  dark.addEventListener("change", recolor)
  gl.enable(gl.DEPTH_TEST)
  link.dataset.live = ""

  let angle = still ? 0.5 : 0
  let speed = 0
  let last = performance.now()
  let frame = 0
  const draw = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    speed *= Math.exp(-DECAY * dt)
    angle += (IDLE + speed) * dt
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.uniform1f(turn, angle)
    gl.uniform3fv(tint, color)
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 6)
    if (!still) frame = requestAnimationFrame(draw)
  }
  const kick = () => {
    speed = Math.min(TOP_SPEED, speed + KICK)
  }
  frame = requestAnimationFrame(draw)
  if (!still) link.addEventListener("pointerenter", kick)
  return () => {
    cancelAnimationFrame(frame)
    link.removeEventListener("pointerenter", kick)
    dark.removeEventListener("change", recolor)
    delete link.dataset.live
  }
}

export function Mark() {
  const linkRef = useRef<HTMLAnchorElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (linkRef.current && canvasRef.current) return spin(linkRef.current, canvasRef.current)
  }, [])

  return (
    <a ref={linkRef} className="credit" href="https://meshal.me">
      Crafted in Kuwait by
      <span className="visually-hidden"> Meshal Almutairi</span>
      <span className="mark">
        <svg viewBox="0 0 870 870" aria-hidden="true">
        <path d="M0 89 435 499 870 89V372L435 782 0 372ZM0 500 299 782H0ZM870 500V782H571Z" />
        </svg>
        <canvas ref={canvasRef} aria-hidden="true" />
      </span>
    </a>
  )
}
