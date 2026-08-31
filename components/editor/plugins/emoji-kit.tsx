'use client'

import emojiMartData from '@emoji-mart/data'
import { EmojiInputPlugin, EmojiPlugin } from '@platejs/emoji/react'
import { EmojiInputElement } from '@/components/ui/emoji-node'

export const EmojiKit = [
  EmojiPlugin.configure({
    // biome-ignore lint/suspicious/noExplicitAny: emoji-mart's dataset shape isn't typed by @platejs/emoji
    options: { data: emojiMartData as any },
  }),
  EmojiInputPlugin.withComponent(EmojiInputElement),
]
