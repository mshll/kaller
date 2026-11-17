/** Encode a version 55 search keyword. This is reversible scrambling, not encryption. */
export function encodeSearchKeyword(term: string): string {
  const bytes = new TextEncoder().encode(`${term}validmenodagkeyword${Date.now()}`)
  const encoded = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
  const midpoint = Math.ceil(encoded.length / 2)
  return encoded.slice(midpoint) + encoded.slice(0, midpoint)
}
