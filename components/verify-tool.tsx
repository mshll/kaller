"use client"

import { useState, type FormEvent } from "react"
import { MessageSquare } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { sendVerification } from "@/lib/api"
import { toast } from "sonner"

export function VerifyTool() {
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
      const result = await sendVerification(phone.trim())
      setResponse(result)
      toast.success("Verification sent!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageSquare className="size-4" />
          SMS Verification
        </CardTitle>
        <CardDescription>Send SMS verification code</CardDescription>
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
          <Button type="submit" size="sm" disabled={isLoading}>
            {isLoading ? <Spinner className="size-3" /> : "Send"}
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
