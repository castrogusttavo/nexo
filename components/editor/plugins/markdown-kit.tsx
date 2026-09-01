import { MarkdownPlugin, remarkMention } from '@platejs/markdown'
import { KEYS } from 'platejs'
import remarkEmoji from 'remark-emoji'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

// FootnoteReferencePlugin/FootnoteDefinitionPlugin já são registrados pelo
// FootnoteKit (interativo) em wiki-editor.tsx — não duplicamos aqui com as
// variantes Base pra não sobrescrever o componente interativo.
export const MarkdownKit = [
  MarkdownPlugin.configure({
    options: {
      // biome-ignore lint/suspicious/noExplicitAny: remark-emoji's plugin type doesn't line up with unified's declared Root/Node generics
      remarkPlugins: [remarkMath, remarkGfm, remarkEmoji as any, remarkMention],
    },
  }),
]
