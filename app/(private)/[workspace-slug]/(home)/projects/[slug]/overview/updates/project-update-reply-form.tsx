'use client'

import { ArrowUp02Icon } from '@hugeicons-pro/core-stroke-rounded'
import { useEffect, useRef, useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'

type ProjectUpdateReplyFormProps = {
  initialValue?: string
  placeholder?: string
  pending?: boolean
  focusKey?: number
  /** Resolves to whether it worked: the text is only cleared when it did. */
  onSubmit: (content: string) => Promise<boolean>
  onCancel?: () => void
}

export function ProjectUpdateReplyForm({
  initialValue = '',
  placeholder = 'Escreva uma resposta',
  pending = false,
  focusKey = 0,
  onSubmit,
  onCancel,
}: ProjectUpdateReplyFormProps) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)
  const text = value.trim()

  useEffect(() => {
    if (focusKey > 0) inputRef.current?.focus()
  }, [focusKey])

  async function submit() {
    if (!text || pending) return
    if (await onSubmit(text)) setValue('')
  }

  return (
    <InputGroup className='flex items-center justify-between'>
      <InputGroupInput
        ref={inputRef}
        value={value}
        maxLength={2000}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
          if (e.key === 'Escape') onCancel?.()
        }}
      />
      <InputGroupAddon>
        <div className='h-full w-px bg-muted-foreground' />
        <Button
          variant='secondary'
          size='icon-xs'
          aria-label='Enviar resposta'
          disabled={!text || pending}
          onClick={submit}
        >
          <NexoIcon icon={ArrowUp02Icon} strokeWidth={2} />
        </Button>
      </InputGroupAddon>
    </InputGroup>
  )
}
