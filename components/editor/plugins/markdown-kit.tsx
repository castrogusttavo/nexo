import { MarkdownPlugin, remarkMention } from '@platejs/markdown'
import { KEYS } from 'platejs'
import remarkEmoji from 'remark-emoji'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

// FootnoteReferencePlugin/FootnoteDefinitionPlugin are already registered by
// FootnoteKit (interactive) in wiki-editor.tsx — we don't duplicate them
// here with the Base variants so we don't override the interactive component.
export const MarkdownKit = [
  MarkdownPlugin.configure({
    options: {
      // biome-ignore lint/suspicious/noExplicitAny: remark-emoji's plugin type doesn't line up with unified's declared Root/Node generics
      remarkPlugins: [remarkMath, remarkGfm, remarkEmoji as any, remarkMention],
    },
  }),
]
