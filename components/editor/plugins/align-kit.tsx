'use client'

import { TextAlignPlugin } from '@platejs/basic-styles/react'
import { KEYS } from 'platejs'

export const AlignKit = [
  TextAlignPlugin.configure({
    inject: {
      targetPlugins: [...KEYS.heading, KEYS.p, KEYS.blockquote],
    },
  }),
]
