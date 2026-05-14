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
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { type ComponentProps, type ReactNode, useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const STICKY_COLORS = [
  'bg-red-950',
  'bg-yellow-950',
  'bg-blue-950',
  'bg-green-950',
  'bg-purple-950',
  'bg-zinc-900',
]
export function UserStick() {
  const [color, setColor] = useState('bg-red-950')

  const editor = useEditor({
    extensions: [StarterKit, TaskList, TaskItem.configure({ nested: false })],
    content: '',
    editorProps: {
      attributes: {
        class:
          'w-full min-h-[256px] max-h-[588px] overflow-y-scroll focus:outline-none',
      },
    },
  })

  return (
    <div
      className={cn(
        'w-[270px] flex flex-col p-4 rounded-sm group/sticky',
        color,
      )}
    >
      <EditorContent editor={editor} />
      <div className='w-full flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <StickPickerColor onColorChange={setColor} />
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
        <StickTextPropsButton onClick={() => editor?.commands.clearContent()}>
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
  onColorChange,
}: {
  onColorChange: (color: string) => void
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
              key={color}
              onClick={() => onColorChange(color)}
              className={cn('size-6 rounded-sm cursor-pointer', color)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
