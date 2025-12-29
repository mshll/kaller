"use client"

import { useState, type FormEvent } from "react"
import { Ban } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { requestBlock } from "@/lib/api"
import { toast } from "sonner"

export function BlockTool() {
  const [phone, setPhone] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!phone.trim()) {
      toast.error("Enter a phone number")
      return
    }

    setIsLoading(true)
    setResponse(null)

    try {
      const result = await requestBlock(phone.trim())
      setResponse(result)
      toast.success("Block request sent!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Block request failed"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Ban className="size-4" />
          Block Request
        </CardTitle>
        <CardDescription>Request number blocking (free)</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="sm" variant="destructive" disabled={isLoading}>
            {isLoading ? <Spinner className="size-3" /> : "Block"}
          </Button>
        </form>
        {response && (
          <div className="mt-3 p-2 rounded-md bg-muted/50 text-sm font-mono break-all">
            {response}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
