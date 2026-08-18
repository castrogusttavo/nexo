import { openEmojiPicker } from "@/components/editor/emoji-picker-popup";
import { SlashCommandItem } from "@/components/editor/slash-command";
import { ChartRelationshipIcon, InformationCircleIcon, LayoutGridIcon, MathIcon, SmileIcon } from "@hugeicons-pro/core-stroke-rounded";
import { Editor, Range } from "@tiptap/react";

export const ADVANCED_SLASH_ITEMS: SlashCommandItem[] = [
  {
    id: 'mermaid',
    label: 'Diagrama Mermaid',
    description: 'Fluxograma, sequência, etc.',
    keywords: ['mermaid', 'diagrama', 'fluxograma'],
    group: 'avancado',
    icon: ChartRelationshipIcon,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: 'mermaidDiagram' }).run()
  },
  {
    id: 'equation-block',
    label: 'Equação',
    description: 'Bloco de equação (LaTex)',
    keywords: ['equacao', 'formula', 'latex', 'math'],
    group: 'avancado',
    icon: MathIcon,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: 'blockEquation' }).run()
  },
  {
    id: 'callout',
    label: 'Callout',
    description: 'Bloco de destaque colorido',
    keywords: ['callout', 'destaque', 'aviso'],
    group: 'avancado',
    icon: InformationCircleIcon,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: 'callout', content: [{ type: 'paragraph' }] }).run()
  },
  ...([2, 3, 4] as const).map(
    (count): SlashCommandItem => ({
      id: `columns-${count}`,
      label: `${count} colunas`,
      description: `Divide o conteúdo em ${count} colunas`,
      keywords: ['colunas', 'columns', String(count)],
      group: 'avancado',
      icon: LayoutGridIcon,
      run: (editor, range) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: 'columns',
            content: Array.from({ length: count }, () => ({
              type: 'column',
              content: [{ type: 'paragraph' }],
            })),
          })
          .run()
      },
    }),
  ),
  {
    id: 'emoji',
    label: 'Emoji',
    description: 'Inserir um emoji',
    keywords: ['emoji', 'emoticon'],
    group: 'avancado',
    icon: SmileIcon,
    run: (editor: Editor, range: Range) => openEmojiPicker(editor, range),
  },
]
