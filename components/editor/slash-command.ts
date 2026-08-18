import { Editor, Extension } from '@tiptap/react'
import { Suggestion, type SuggestionOptions } from '@tiptap/suggestion'
import { Range } from '@tiptap/react'

export interface SlashCommandItem {
  id: string
  label: string
  description: string
  keywords: string[]
  group: 'basico' | 'midia' | 'avancado'
  icon: Parameters<typeof import('@/components/icon/icon').NexoIcon>[0]['icon']
  run: (editor: Editor, range: Range) => void
}

export const SlashCommand = Extension.create<{
  suggestion: Omit<SuggestionOptions<SlashCommandItem>, 'editor'>
}>({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }) => {
          props.run(editor, range)
        }
      }
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        ...this.options.suggestion
      })
    ]
  }
})
