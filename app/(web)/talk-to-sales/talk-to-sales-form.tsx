'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLogger } from '@/lib/axiom/client'
import { notify } from '@/lib/notify'
import { TEAM_SIZES } from '@/src/schemas/talk-to-sales.schema'

const EMPTY = { name: '', email: '', message: '' }

export function TalkToSalesForm() {
  const log = useLogger()
  const [fields, setFields] = useState(EMPTY)
  const [teamSize, setTeamSize] = useState<string>('1-10')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  )
  const [error, setError] = useState<string | null>(null)

  const sending = status === 'sending'

  function update(key: keyof typeof EMPTY) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit(
    e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) {
    e.preventDefault()

    setError(null)
    setStatus('sending')

    const form = new FormData(e.currentTarget)
    const payload = {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      teamSize,
      message: String(form.get('message') ?? ''),
    }

    try {
      const res = await fetch('/api/talk-to-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setFields(EMPTY)
        setTeamSize('')
        setStatus('sent')
        return
      }
      notify.error('Verifique os campos e tente novamente')
      setStatus('error')
    } catch (err) {
      log.error('tal_to_sales.submit_failed', {
        component: 'TalkToSalesForm',
        message: err instanceof Error ? err.message : String(err),
      })
      notify.error('Não foi possível enviar. Tente novamente.')
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className='max-w-md text-center'>
        <h4 className='text-2xl font-medium'>Recebemos seu contato 🎉</h4>
        <p className='text-muted-foreground mt-2'>
          Nosso time de vendas responderá no e-mail informado em breve.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='w-full h-full flex flex-col gap-7 items-center justify-center py-20 px-10'
    >
      <Field>
        <FieldLabel htmlFor='name'>
          Seu nome <span className='text-destructive'>*</span>
        </FieldLabel>
        <Input
          id='name'
          name='name'
          value={fields.name}
          onChange={update('name')}
          placeholder='Alan Turing'
          required
          disabled={sending}
        />
      </Field>
      <Field>
        <FieldLabel>
          Seu e-mail <span className='text-destructive'>*</span>
        </FieldLabel>
        <Input
          id='email'
          name='email'
          type='email'
          value={fields.email}
          onChange={update('email')}
          placeholder='alan@turing.com'
          required
          disabled={sending}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor='teamSize'>
          Quão grande é a sua equipe?{' '}
          <span className='text-destructive'>*</span>
        </FieldLabel>
        <Select
          value={teamSize}
          onValueChange={(value) => {
            setTeamSize(value ?? '')
          }}
        >
          <SelectTrigger id='teamSize'>
            <SelectValue placeholder='Selecione' />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              {TEAM_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size} pessoas
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor='message' className='font-semibold'>
          O que traz você ao Nexo?
        </FieldLabel>
        <Textarea
          id='message'
          name='message'
          rows={4}
          value={fields.message}
          onChange={update('message')}
          placeholder='Detalhes sobre seu caso de uso, recursos da lista de desejos, se você prefere o Nexo self-hosted, qualquer coisa vale'
          required
          disabled={sending}
        />
      </Field>
      {error && <FieldError>{error}</FieldError>}
      <Button className='w-full' type='submit' disabled={status === 'sending'}>
        {status === 'sending' ? 'Enviando...' : 'Falar com vendas'}
      </Button>
    </form>
  )
}
