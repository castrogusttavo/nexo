'use client'

import {
  InformationCircleIcon,
  Search01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { EmojiPicker as EmojiPickerPrimitive } from 'frimousse'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Smaller } from '@/components/typography/text/smaller'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmojiPicker, EmojiPickerContent } from '@/components/ui/emoji-picker'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProjectEmoji } from '../project-emoji'
import { LUCIDE_ICONS } from './lucide-icons'

interface ProjectEmojiIconPickerProps {
  currentEmoji?: string
  onSelect?: (emoji: string) => void
}

export function ProjectEmojiIconPicker({
  currentEmoji,
  onSelect,
}: ProjectEmojiIconPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant='secondary' className='size-12 text-lg'>
            <ProjectEmoji value={currentEmoji} fallback='😊' size={20} />
          </Button>
        }
      />
      <DropdownMenuContent className='w-auto p-2.5' align='start'>
        <Tabs defaultValue='icon' className='w-full'>
          <TabsList className='bg-transparent! w-full flex'>
            <TabsTrigger value='emoji'>Emoji</TabsTrigger>
            <TabsTrigger value='icon'>Icon</TabsTrigger>
          </TabsList>
          <TabsContent value='emoji' className='min-w-82.5 max-w-min'>
            <EmojiTab onSelect={onSelect} />
          </TabsContent>
          <TabsContent value='icon' className='min-w-82.5 max-w-min'>
            <IconsTab onSelect={onSelect} />
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EmojiTab({ onSelect }: { onSelect?: (emoji: string) => void }) {
  const [search, setSearch] = useState('')

  return (
    <EmojiPicker
      className='h-81.5 scrollbar-hidden overflow-visible w-full'
      onEmojiSelect={({ emoji }) => {
        onSelect?.(emoji)
      }}
    >
      <div
        onKeyDown={(e) => e.stopPropagation()}
        className='flex items-center gap-2 z-50'
      >
        <InputGroup className='flex-1'>
          <InputGroupInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Pesquisar'
          />
          <InputGroupAddon align='inline-start'>
            <NexoIcon icon={Search01Icon} />
          </InputGroupAddon>
        </InputGroup>
        <EmojiPickerPrimitive.SkinToneSelector className='flex size-9 items-center justify-center rounded-md text-lg transition-colors' />
        <EmojiPickerPrimitive.Search
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='sr-only hidden'
          tabIndex={-1}
          aria-hidden='true'
        />
      </div>
      <EmojiPickerContent className='scrollbar-hidden w-full justify-between' />
    </EmojiPicker>
  )
}

function IconsTab({ onSelect }: { onSelect?: (emoji: string) => void }) {
  const [search, setSearch] = useState('')
  const [color, setColor] = useState('#5c5e63')

  const ICON_COLOR = [
    { color: '#5c5e63', value: 'gray', label: 'Cinza' },
    { color: '#ff5b59', value: 'peach', label: 'Pêssego' },
    { color: '#f65385', value: 'pink', label: 'Rosa' },
    { color: '#fd9038', value: 'orange', label: 'Laranja' },
    { color: '#0fc27b', value: 'green', label: 'Verde' },
    { color: '#17bee9', value: 'light-blue', label: 'Azul-claro' },
    { color: '#266df0', value: 'dark-blue', label: 'Azul-escuro' },
    { color: '#9162f9', value: 'purple', label: 'Roxo' },
  ]

  const filteredIcons = LUCIDE_ICONS.filter((icon) =>
    icon.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className='flex flex-col gap-4'>
      <div className='z-50 flex flex-col gap-3'>
        <InputGroup>
          <InputGroupInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder='Pesquisar'
          />
          <InputGroupAddon align='inline-start'>
            <NexoIcon icon={Search01Icon} />
          </InputGroupAddon>
        </InputGroup>
        <div className='flex flex-col gap-2'>
          <div className='w-full flex items-center justify-between'>
            {ICON_COLOR.map((iconColor) => (
              <button
                type='button'
                key={iconColor.value}
                aria-label={`Cor ${iconColor.label}`}
                aria-pressed={color === iconColor.color}
                onClick={() => setColor(iconColor.color)}
                className='p-0 m-0 size-6 rounded border border-border hover:opacity-80 flex items-center justify-center cursor-pointer'
                style={{ backgroundColor: iconColor.color || 'transparent' }}
              />
            ))}
          </div>
          <div className='flex items-center text-[10px] justify-between w-full gap-1.5'>
            <NexoIcon icon={InformationCircleIcon} size={20} strokeWidth={2} />
            <Smaller className='text-xs'>
              As cores serão ajustadas para garantir contraste suficiente.
            </Smaller>
          </div>
        </div>
      </div>

      <div className='flex flex-wrap gap-3 max-h-64 overflow-y-auto scrollbar-hidden'>
        {filteredIcons.map(({ name, icon: IconComponent }) => (
          <button
            type='button'
            key={name}
            aria-label={name}
            onClick={() => onSelect?.(`${name}:${color}`)}
            className='flex flex-col items-center gap-1 p-2 hover:bg-accent rounded cursor-pointer'
          >
            <IconComponent color={color} size={20} />
          </button>
        ))}
      </div>

      {filteredIcons.length === 0 && (
        <Smaller className='text-center text-muted-foreground py-8'>
          Nenhum ícone encontrado
        </Smaller>
      )}
    </div>
  )
}
