import { LayerMask01Icon, LinkSquare02Icon, Ticket01Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { EmbedMatch } from '@/lib/embed-providers'
import type { SlashCommandItem } from '@/components/editor/slash-command'

export function createExternalEmbedItem(
  resolve: (url: string) => Promise<EmbedMatch & { thumbnailKey: string | null }>,
): SlashCommandItem {
  return {
    id: 'embed',
    label: 'Embed',
    description: 'Figma, Loom, YouTube, Google Docs/Sheets',
    keywords: ['embed', 'figma', 'loom', 'youtube', 'docs', 'sheets'],
    group: 'avancado',
    icon: LinkSquare02Icon,
    run: (editor, range) => {
      const url = window.prompt('Cole o link (Figma, Loom, YouTube, Google Docs/Sheets)')
      if (!url) return
      resolve(url).then((meta) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({ type: 'externalEmbed', attrs: meta })
          .run()
      })
    },
  }
}

export function createIssueEmbedItem(): SlashCommandItem {
  return {
    id: 'embed-issue',
    label: 'Issue',
    description: 'Referencia uma issue do projeto',
    keywords: ['issue', 'referencia'],
    group: 'avancado',
    icon: Ticket01Icon,
    run: (editor, range) => {
      const identifier = window.prompt('Identifier da issue')
      if (!identifier) return
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: 'internalEmbed', attrs: { entityType: 'issue', entityRef: identifier } })
        .run()
    },
  }
}

export function createCycleEmbedItem(cycles: { id: string; name: string }[]): SlashCommandItem {
  return {
    id: 'embed-cycle',
    label: 'Cycle',
    description: 'Referencia um ciclo do projeto',
    keywords: ['cycle', 'ciclo'],
    group: 'avancado',
    icon: LayerMask01Icon,
    run: (editor, range) => {
      const name = window.prompt(`Nome do ciclo (${cycles.map((c) => c.name).join(', ')})`)
      if (!name) return
      const cycle = cycles.find((c) => c.name === name)
      if (!cycle) return
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: 'internalEmbed', attrs: { entityType: 'cycle', entityRef: cycle.id } })
        .run()
    },
  }
}
