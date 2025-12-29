"use client"

import { Cog } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ConfigViewer } from "@/components/config-viewer"

export function ConfigSection() {
  return (
    <Accordion>
      <AccordionItem value="config" className="border-none">
        <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground py-3">
          <span className="flex items-center gap-2">
            <Cog className="size-4" />
            Config
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="pt-2 px-1">
            <ConfigViewer />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
