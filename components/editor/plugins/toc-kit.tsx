'use client'

import { TocElement } from "@/components/ui/toc-node"
import { TocPlugin } from "@platejs/toc/react"

export const TocKit = [
  TocPlugin.configure({
    options: { topOffset: 80 }
  }).withComponent(TocElement)
]
