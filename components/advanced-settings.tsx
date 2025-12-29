"use client"

import { Settings } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { VerifyTool } from "@/components/verify-tool"
import { BlockTool } from "@/components/block-tool"

export function AdvancedSettings() {
  return (
    <Accordion>
      <AccordionItem value="advanced" className="border-none">
        <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground py-3">
          <span className="flex items-center gap-2">
            <Settings className="size-4" />
            Advanced
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pt-2 px-1">
            <VerifyTool />
            <BlockTool />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
