export type EditorColorDTO =
  | 'default'
  | 'gray'
  | 'peach'
  | 'pink'
  | 'orange'
  | 'green'
  | 'light-blue'
  | 'dark-blue'
  | 'purple'

interface EditorColor {
  value: EditorColorDTO
  label: string
  text: string | null
  background: string | null
}

export const EDITOR_COLORS: EditorColor[] = [
  { value: 'default', label: 'Padrão', text: null, background: null },
  { value: 'gray', label: 'Cinza', text: '#787774', background: '#F1F1EF' },
  { value: 'peach', label: 'Pêssego', text: '#C2703C', background: '#FBEEE0' },
  { value: 'pink', label: 'Rosa', text: '#C14C8A', background: '#FAE5EE' },
  { value: 'orange', label: 'Laranja', text: '#D9730D', background: '#FAEBDD' },
  { value: 'green', label: 'Verde', text: '#448361', background: '#EDF3EC' },
  { value: 'light-blue', label: 'Azul claro', text: '#3B82C4', background: '#E7F3F8' },
  { value: 'dark-blue', label: 'Azul escuro', text: '#2952A3', background: '#E4E9F7' },
  { value: 'purple', label: 'Roxo', text: '#9065B0', background: '#F3EDF7' },
]

export function findEditorColor(value: EditorColorDTO): EditorColor {
  return EDITOR_COLORS.find((color) => color.value === value) ?? EDITOR_COLORS[0]
}
