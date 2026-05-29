'use client'

import {
  CheckListIcon,
  Delete02Icon,
  PaintBoardIcon,
  TextBoldIcon,
  TextItalicIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { EditorContent, type JSONContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useUpdateStickyNote } from '@/src/hooks/use-sticky-note'
import type { StickyColorDTO, StickyNoteDTO } from '@/types/sticky-note'

const STICKY_COLORS: Array<{ value: StickyColorDTO; bg: string }> = [
  { value: 'RED', bg: 'bg-red-950' },
  { value: 'YELLOW', bg: 'bg-yellow-950' },
  { value: 'BLUE', bg: 'bg-blue-950' },
  { value: 'GREEN', bg: 'bg-green-950' },
  { value: 'PURPLE', bg: 'bg-purple-950' },
  { value: 'ZINC', bg: 'bg-zinc-950' },
]

const SAVE_DEBOUNCE_MS = 800

function colorToBg(color: StickyColorDTO): string {
  return STICKY_COLORS.find((c) => c.value === color)?.bg ?? 'bg-zinc-950'
}

interface UserStickyProps {
  sticky: StickyNoteDTO
}

export function UserStick({ sticky }: UserStickyProps) {
  const [color, setColor] = useState<StickyColorDTO>(sticky.color)
  const update = useUpdateStickyNote(sticky.id)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingContentRef = useRef<JSONContent | null>(null)

  const flushContent = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (pendingContentRef.current) {
      const content = pendingContentRef.current
      pendingContentRef.current = null
      update.mutate({ content })
    }
  }

  const scheduleContentSave = (content: JSONContent) => {
    pendingContentRef.current = content
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(flushContent, SAVE_DEBOUNCE_MS)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, TaskList, TaskItem.configure({ nested: false })],
    content: sticky.content,
    editorProps: {
      attributes: {
        class:
          'w-full min-h-[256px] max-h-[588px] overflow-y-scroll focus:outline-none',
      },
    },
    onUpdate: ({ editor, transaction }) => {
      if (!transaction.docChanged) return
      scheduleContentSave(editor.getJSON())
    },
    onBlur: () => {
      flushContent()
    },
  })

  const handleColorChange = (next: StickyColorDTO) => {
    setColor(next)
    update.mutate({ color: next })
  }

  const handleClear = () => {
    editor?.commands.clearContent()
    flushContent()
    update.mutate({ content: { type: 'doc', content: [] } })
  }

  return (
    <div
      className={cn(
        'w-67.5 flex flex-col p-4 rounded-sm group/sticky',
        colorToBg(color),
      )}
    >
      <EditorContent editor={editor} />
      <div className='w-full flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <StickPickerColor
            currentColor={color}
            onColorChange={handleColorChange}
          />
          <StickTextPropsButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <NexoIcon icon={TextBoldIcon} strokeWidth={2} />
          </StickTextPropsButton>
          <StickTextPropsButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <NexoIcon icon={TextItalicIcon} strokeWidth={2} />
          </StickTextPropsButton>
          <StickTextPropsButton
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
          >
            <NexoIcon icon={CheckListIcon} strokeWidth={2} />
          </StickTextPropsButton>
        </div>
        <StickTextPropsButton onClick={handleClear}>
          <NexoIcon icon={Delete02Icon} strokeWidth={2} />
        </StickTextPropsButton>
      </div>
    </div>
  )
}

interface StickTextPropsButtonProps extends ComponentProps<typeof Button> {
  children: ReactNode
}

function StickTextPropsButton({
  children,
  ...props
}: StickTextPropsButtonProps) {
  return (
    <Button
      {...props}
      variant='ghost'
      size='icon-sm'
      className='hover:bg-transparent!'
    >
      {children}
    </Button>
  )
}

function StickPickerColor({
  currentColor,
  onColorChange,
}: {
  currentColor: StickyColorDTO
  onColorChange: (color: StickyColorDTO) => void
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <StickTextPropsButton>
            <NexoIcon icon={PaintBoardIcon} strokeWidth={2} />
          </StickTextPropsButton>
        }
      />
      <PopoverContent align='start' className='w-48'>
        <div className='flex flex-wrap gap-2'>
          {STICKY_COLORS.map((color) => (
            <button
              key={color.value}
              type='button'
              onClick={() => onColorChange(color.value)}
              className={cn(
                'size-6 rounded-sm cursor-pointer',
                color.bg,
                currentColor === color.value && 'ring-2 ring-primary',
              )}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
