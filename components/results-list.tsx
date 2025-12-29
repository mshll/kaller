"use client"

import { useState, useEffect } from "react"
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

export function ResultsList({
  results,
  isLoading,
  hasSearched,
}: ResultsListProps) {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE)

  // Reset display count when results change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE)
  }, [results])

  const displayedResults = results.slice(0, displayCount)
  const hasMore = displayCount < results.length
  const remainingCount = results.length - displayCount

  const copyToClipboard = (text: string, type: "name" | "phone") => {
    navigator.clipboard.writeText(text)
    toast.success(`${type === "name" ? "Name" : "Phone"} copied`)
  }

  const loadMore = () => {
    setDisplayCount((prev) => prev + ITEMS_PER_PAGE)
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
            <p className="font-medium truncate">{result.name}</p>
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
