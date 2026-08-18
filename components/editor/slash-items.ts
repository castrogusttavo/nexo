import { CheckListIcon, CodeIcon, Heading01Icon, Heading02Icon, Heading03Icon, Heading04Icon, Heading05Icon, Heading06Icon, Image01Icon, LeftToRightListBulletIcon, LeftToRightListNumberIcon, MinusSignIcon, QuotesIcon, TableIcon, TextIcon } from "@hugeicons-pro/core-stroke-rounded";
import { SlashCommandItem } from "./slash-command";

const HEADING_ICONS = [
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  Heading04Icon,
  Heading05Icon,
  Heading06Icon,
] as const

export const SLASH_COMMAND_ITEMS: SlashCommandItem[] = [
  {
    id: 'text',
    label: 'Texto',
    description: 'Parágrafo simples',
    keywords: ['texto', 'paragrafo'],
    group: 'basico',
    icon: TextIcon,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).setParagraph().run()
    }
  },
  ...([1, 2, 3, 4, 5, 6] as const).map((level): SlashCommandItem => ({
    id: `heading-${level}`,
    label: `Título ${level}`,
    description: `Cabeçalho nível ${level}`,
    keywords: ['titulo', 'heading', `h${level}`],
    group: 'basico' as const,
    icon: HEADING_ICONS[level - 1],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level }).run()
    },
  })),
  {
    id: 'bullet-list',
    label: 'Lista com marcadores',
    description: 'Lista simples com marcadores',
    keywords: ['lista', 'bullet', 'marcadores'],
    group: 'basico',
    icon: LeftToRightListBulletIcon,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    }
  },
  {
    id: 'ordered-list',
    label: 'Lista numerada',
    description: 'Lista com numeração',
    keywords: ['lista', 'numerada', 'ordered'],
    group: 'basico',
    icon: LeftToRightListNumberIcon,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    }
  },
  {
    id: 'todo-list',
    label: 'Lista de tarefas',
    description: 'Checklist com itens marcáveis',
    keywords: ['lista', 'tarefa', 'checklist'],
    group: 'basico',
    icon: CheckListIcon,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run()
    }
  },
  {
    id: 'quote',
    label: 'Citação',
    description: 'Bloco de citação',
    keywords: ['quote', 'citacao'],
    group: 'basico',
    icon: QuotesIcon,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    }
  },
  {
    id: 'code',
    label: 'Código',
    description: 'Bloco de código',
    keywords: ['code', 'codigo'],
    group: 'basico',
    icon: CodeIcon,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
    }
  },
  {
    id: 'divider',
    label: 'Divisor',
    description: 'Linha horizontal',
    keywords: ['divider', 'divisor', 'linha'],
    group: 'basico',
    icon: MinusSignIcon,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    }
  },
  {
    id: 'table',
    label: 'Tabela',
    description: 'Tabela 3x3',
    keywords: ['table', 'tabela'],
    group: 'basico',
    icon: TableIcon,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }
  }
]
