'use client'

import { FootnoteDefinitionPlugin, FootnoteInputPlugin, FootnoteReferencePlugin } from '@platejs/footnote/react'
import { FootnoteDefinitionElement, FootnoteInputElement, FootnoteReferenceElement } from '@/components/ui/footnote-node'

export const FootnoteKit = [
  FootnoteReferencePlugin.withComponent(FootnoteReferenceElement),
  FootnoteDefinitionPlugin.withComponent(FootnoteDefinitionElement),
  FootnoteInputPlugin.withComponent(FootnoteInputElement),
]
