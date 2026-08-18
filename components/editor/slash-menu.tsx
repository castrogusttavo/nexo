'use client'

import { computePosition, flip, offset, shift } from '@floating-ui/react'
import { SuggestionKeyDownProps, SuggestionOptions, SuggestionProps } from "@tiptap/suggestion"
import { SlashCommandItem } from "./slash-command"
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"
import { NexoIcon } from "../icon/icon"
import { ReactRenderer } from '@tiptap/react'

const GROUP_LABELS: Record<SlashCommandItem['group'], string> = {
  basico: 'Básico',
  midia: 'Mídia',
  avancado: 'Avançado'
}

interface SlashMenuHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

const SlashMenu = forwardRef<SlashMenuHandle, SuggestionProps<SlashCommandItem>>(
  function SlashMenu({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    const grouped = useMemo(() => {
      const groups = new Map<SlashCommandItem['group'], SlashCommandItem[]>()
      for (const item of items) {
        const list = groups.get(item.group) ?? []
        list.push(item)
        groups.set(item.group, list)
      }
      return groups
    }, [items])

    function selectItem(index: number) {
      const item = items[index]
      if (item) command(item)
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((current) => (current + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((current) => (current + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className='w-64 rounded-md border border-border bg-popover p-2 text-muted-foreground text-xs shadow-md'>
          Nenhum resultado.
        </div>
      )
    }

    return (
      <div className='max-h-80 w-64 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md'>
        {Array.from(grouped.entries()).map(([group, groupItems]) => (
          <div key={group} className='mb-1'>
            <div className='px-2 py-1 font-medium text-[10px] text-muted-foreground uppercase'>
              {GROUP_LABELS[group]}
            </div>
            {groupItems.map((item) => {
              const index = items.indexOf(item)
              return (
                <button
                  key={item.id}
                  type='button'
                  className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm ${
                    index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => selectItem(index)}
                >
                  <NexoIcon icon={item.icon} strokeWidth={2} />
                  <div className='flex flex-col'>
                    <span>{item.label}</span>
                    <span className='text-muted-foreground text-xs'>{item.description}</span>
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    )
  },
)

function updatePosition(rect: DOMRect | null, popup: HTMLElement) {
  if (!rect) return
  const virtualEl = { getBoundingClientRect: () => rect }
  computePosition(virtualEl, popup, {
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  }).then(({ x, y }) => {
    popup.style.left = `${x}px`
    popup.style.top = `${y}px`
  })
}

export function createSlashSuggestion(items: SlashCommandItem[]): Omit<SuggestionOptions<SlashCommandItem>, 'editor'> {
  return {
    char: '/',
    startOfLine: false,
    items: ({ query }) => {
      if (!query) return items
      const lower = query.toLowerCase()
      return items.filter(
        (item) =>
          item.label.toLowerCase().includes(lower) ||
          item.keywords.some((keyword) => keyword.includes(lower)),
      )
    },
    command: ({ editor, range, props }) => {
      props.run(editor, range)
    },
    render: () => {
      let component: ReactRenderer<SlashMenuHandle, SuggestionProps<SlashCommandItem>>
      let popup: HTMLDivElement

      return {
        onStart: (props) => {
          component = new ReactRenderer(SlashMenu, { props, editor: props.editor })
          popup = document.createElement('div')
          popup.style.position = 'absolute'
          popup.style.zIndex = '50'
          document.body.appendChild(popup)
          popup.appendChild(component.element)
          updatePosition(props.clientRect?.() ?? null, popup)
        },
        onUpdate: (props) => {
          component.updateProps(props)
          updatePosition(props.clientRect?.() ?? null, popup)
        },
        onKeyDown: (props) => {
          if (props.event.key === 'Escape') {
            popup.remove()
            return true
          }
          return component.ref?.onKeyDown(props) ?? false
        },
        onExit: () => {
          popup.remove()
          component.destroy()
        }
      }
    }
  }
}
