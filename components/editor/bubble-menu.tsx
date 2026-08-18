'use client'

import type { Editor } from "@tiptap/react"
import { NexoIcon } from "../icon/icon"
import { BubbleMenu } from '@tiptap/react/menus'
import { Link01Icon, TextAlignCenterIcon, TextAlignLeftIcon, TextAlignRightIcon, TextBoldIcon, TextItalicIcon, TextStrikethroughIcon, TextUnderlineIcon, TypeCursorIcon } from "@hugeicons-pro/core-stroke-rounded"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Button } from "../ui/button"
import { Separator } from "../ui/separator"
import { EDITOR_COLORS } from "./colors"

type IconType = Parameters<typeof NexoIcon>[0]['icon']

interface EditorBubbleMenuProps {
  editor: Editor
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey='textSelection'
      className="flex items-center gap-0.5 rounded-md border border-border bg-popover p-1 shadow-md"
    >
      <TurnIntoMenu editor={editor} />
      <Separator orientation='vertical' className='mx-1 h-4' />
      <ToggleButton
        icon={TextBoldIcon}
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToggleButton
        icon={TextItalicIcon}
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToggleButton
        icon={TextUnderlineIcon}
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToggleButton
        icon={TextStrikethroughIcon}
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <ToggleButton
        icon={Link01Icon}
        active={editor.isActive('link')}
        onClick={() => {
          const previous = editor.getAttributes('link').href as string | undefined
          const url = window.prompt('URL do link', previous ?? '')
          if (url === null) return
          if (url === '') {
            editor.chain().focus().unsetLink().run()
            return
          }
          editor.chain().focus().setLink({ href: url }).run()
        }}
      />
      <Separator orientation='vertical' className='mx-1 h-4' />
      <ToggleButton
        icon={TextAlignLeftIcon}
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      />
      <ToggleButton
        icon={TextAlignCenterIcon}
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      />
      <ToggleButton
        icon={TextAlignRightIcon}
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      />
      <Separator orientation='vertical' className='mx-1 h-4' />
      <ColorMenu editor={editor} />
    </BubbleMenu>
  )
}

function ToggleButton({
  icon,
  active,
  onClick
}: {
  icon: IconType,
  active: boolean,
  onClick: () => void
}) {
  return (
    <Button
      type='button'
      variant={active ? 'secondary' : 'ghost'}
      size='icon-sm'
      onClick={onClick}
    >
      <NexoIcon icon={icon} strokeWidth={2} />
    </Button>
  )
}

const TURN_INTO_OPTIONS = [
  { label: 'Texto', run: (editor: Editor) => editor.chain().focus().setParagraph().run() },
  { label: 'Título 1', run: (editor: Editor) => editor.chain().focus().setHeading({ level: 1 }).run() },
  { label: 'Título 2', run: (editor: Editor) => editor.chain().focus().setHeading({ level: 2 }).run() },
  { label: 'Título 3', run: (editor: Editor) => editor.chain().focus().setHeading({ level: 3 }).run() },
  { label: 'Lista com marcadores', run: (editor: Editor) => editor.chain().focus().toggleBulletList().run() },
  { label: 'Lista numerada', run: (editor: Editor) => editor.chain().focus().toggleOrderedList().run() },
  { label: 'Citação', run: (editor: Editor) => editor.chain().focus().toggleBlockquote().run() },
]

function TurnIntoMenu({ editor }: { editor: Editor }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type='button' variant='ghost' size='icon-sm'>
            <NexoIcon icon={TypeCursorIcon} strokeWidth={2} />
          </Button>
        }
      />
      <PopoverContent className='w-48 p-1'>
        {TURN_INTO_OPTIONS.map((option) => (
          <Button
            key={option.label}
            type='button'
            variant='ghost'
            className='w-full justify-start font-normal'
            onClick={() => option.run(editor)}
          >
            {option.label}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function ColorMenu({ editor }: { editor: Editor }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type='button' variant='ghost' size='icon-sm'>
            A
          </Button>
        }
      />
      <PopoverContent className='w-48 p-1'>
        {EDITOR_COLORS.map((color) => (
          <button
            key={color.value}
            type='button'
            title={color.label}
            className='size-6 cursor-pointer rounded-full border border-border'
            style={{ backgroundColor: color.background ?? 'transparent' }}
            onClick={() => {
              if (color.text) editor.chain().focus().setColor(color.text).run()
              else editor.chain().focus().unsetColor().run()

              if (color.background) {
                editor.chain().focus().toggleHighlight({ color: color.background }).run()
              } else {
                editor.chain().focus().unsetHighlight().run()
              }
            }}
          />
        ))}
      </PopoverContent>
    </Popover>
  )
}
