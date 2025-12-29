"use client"

import { useState } from "react"
import { Settings, Check, Eye, EyeOff } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { getConfig } from "@/lib/api"
import type { FirebaseConfig } from "@/lib/config"
import { toast } from "sonner"

export function ConfigViewer() {
  const [config, setConfig] = useState<FirebaseConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)

  const loadConfig = async () => {
    setIsLoading(true)

    try {
      const data = await getConfig()
      setConfig(data)
      toast.success("Configuration loaded!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load config"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const maskValue = (value: string | undefined) => {
    if (!value) return "—"
    if (showSecrets) return value
    if (value.length <= 8) return "••••••••"
    return value.slice(0, 4) + "••••" + value.slice(-4)
  }

  const configItems = config
    ? [
        { label: "API Base", value: config.base, secret: false },
        { label: "Stripe Public Key", value: config.stripe_pub_key, secret: true },
        { label: "Stripe Secret Key", value: config.stripe_sec_key, secret: true },
        { label: "Currency", value: config.stripe_currency?.toUpperCase(), secret: false },
        { label: "Price", value: config.stripe_price ? `$${(config.stripe_price / 100).toFixed(2)}` : undefined, secret: false },
      ]
    : []

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="size-4" />
          API Configuration
        </CardTitle>
        <CardDescription>View the current API configuration</CardDescription>
      </CardHeader>
      <CardContent>
        {!config ? (
          <Button onClick={loadConfig} size="sm" variant="outline" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner className="size-3" />
                Loading...
              </>
            ) : (
              <>
                <Settings className="size-3" />
                Load Config
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="size-3 text-green-500" />
                Connected
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowSecrets(!showSecrets)}
                title={showSecrets ? "Hide secrets" : "Show secrets"}
              >
                {showSecrets ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
              </Button>
            </div>
            <div className="grid gap-2 text-xs">
              {isLoading
                ? [1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))
                : configItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between gap-4 py-1 border-b border-border/40 last:border-0"
                    >
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-mono text-right truncate max-w-[200px]">
                        {item.secret ? maskValue(item.value) : item.value || "—"}
                      </span>
                    </div>
                  ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
