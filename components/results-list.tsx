"use client"

import { useState } from "react"
import { User, Phone, Copy, ChevronDown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import type { SearchResult } from "@/lib/config"
import { toast } from "sonner"

interface ResultsListProps {
  results: SearchResult[]
  isLoading: boolean
  hasSearched: boolean
}

const ITEMS_PER_PAGE = 20
const KUWAIT_COUNTRY_CODE = "965"

function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith(KUWAIT_COUNTRY_CODE)) return digits
  if (digits.startsWith("00")) return digits.slice(2)
  return `${KUWAIT_COUNTRY_CODE}${digits}`
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91a9.85 9.85 0 0 0-2.91-7.01ZM12.04 20.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.2 8.2 0 0 1 5.83 2.42 8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.17 1.76 2.69 4.27 3.78.6.26 1.06.41 1.43.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.23-.17-.48-.29Z" />
    </svg>
  )
}

export function ResultsList({
  results,
  isLoading,
  hasSearched,
}: ResultsListProps) {
  const [pagination, setPagination] = useState({ results, count: ITEMS_PER_PAGE })
  const displayCount = pagination.results === results ? pagination.count : ITEMS_PER_PAGE

  const displayedResults = results.slice(0, displayCount)
  const hasMore = displayCount < results.length
  const remainingCount = results.length - displayCount

  const copyToClipboard = (text: string, type: "name" | "phone") => {
    navigator.clipboard.writeText(text)
    toast.success(`${type === "name" ? "Name" : "Phone"} copied`)
  }

  const openWhatsApp = (phone: string) => {
    const number = toWhatsAppNumber(phone)
    window.open(`https://wa.me/${number}`, "_blank", "noopener,noreferrer")
  }

  const loadMore = () => {
    setPagination({ results, count: displayCount + ITEMS_PER_PAGE })
  }

  if (isLoading) {
    return (
      <div className="space-y-2 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!hasSearched) {
    return null
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Phone className="size-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No matches found</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 pt-4">
      <p className="text-xs text-muted-foreground px-1 pb-1">
        {results.length} result{results.length !== 1 ? "s" : ""}
      </p>

      {displayedResults.map((result, index) => (
        <div
          key={`${result.phone}-${index}`}
          className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 active:bg-muted/50 transition-colors"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium break-words">{result.name}</p>
            <p className="text-sm text-muted-foreground font-mono">{result.phone}</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(result.name, "name")}
              className="size-9 rounded-full"
              title="Copy name"
            >
              <Copy className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(result.phone, "phone")}
              className="size-9 rounded-full"
              title="Copy phone"
            >
              <Phone className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openWhatsApp(result.phone)}
              className="size-9 rounded-full text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10"
              title="Open WhatsApp chat"
              aria-label="Open WhatsApp chat"
            >
              <WhatsAppIcon className="size-4" />
            </Button>
          </div>
        </div>
      ))}

      {hasMore && (
        <Button
          variant="ghost"
          onClick={loadMore}
          className="w-full h-12 mt-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className="size-4 mr-2" />
          Show more ({remainingCount} remaining)
        </Button>
      )}
    </div>
  )
}
