'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useLogger } from '@/lib/axiom/client'
import { notify } from '@/lib/notify'

interface Props {
  slug: string
}

export function CareerApplicationForm({ slug }: Props) {
  const log = useLogger()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  )
  const [consent, setConsent] = useState(false)
  const [message, setMessage] = useState('')

  const sending = status === 'sending'

  async function handleSubmit(
    e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) {
    e.preventDefault()
    setStatus('sending')

    const form = new FormData(e.currentTarget)
    form.set('consent', consent ? 'true' : 'false')

    try {
      const res = await fetch(`/api/careers/${slug}/apply`, {
        method: 'POST',
        body: form,
      })
      if (res.ok) {
        setStatus('sent')
        return
      }
      notify.error('Verifique os campos e tente novamente')
      setStatus('error')
    } catch (err) {
      log.error('career_application.submit_failed', {
        component: 'CareerApplicationForm',
        message: err instanceof Error ? err.message : String(err),
      })
      notify.error('Não foi possível enviar. Tente novamente.')
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className='text-center'>
        <h4 className='text-2xl font-medium'>Candidatura recebida 🎉</h4>
        <p className='text-muted-foreground mt-2'>
          Vamos analisar seu perfil e entrar em contato pelo e-mail informado.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-6'>
      {/* Honeypot: hidden from real users via off-screen CSS (not
          display:none, which some bots skip when filling forms). */}
      <input
        type='text'
        name='honeypot'
        tabIndex={-1}
        autoComplete='off'
        className='absolute left-[-9999px] h-0 w-0 opacity-0'
        aria-hidden='true'
      />

      <Field>
        <FieldLabel htmlFor='name'>
          Nome <span className='text-destructive'>*</span>
        </FieldLabel>
        <Input
          id='name'
          name='name'
          placeholder='Seu nome'
          required
          disabled={sending}
        />
      </Field>

      <FieldGroup className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4'>
        <Field>
          <FieldLabel htmlFor='email'>
            E-mail <span className='text-destructive'>*</span>
          </FieldLabel>
          <Input
            id='email'
            name='email'
            type='email'
            placeholder='nome@empresa.com'
            required
            disabled={sending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor='phone'>Telefone</FieldLabel>
          <Input
            id='phone'
            name='phone'
            placeholder='(11) 91234-5678'
            disabled={sending}
          />
        </Field>
      </FieldGroup>

      <Field>
        <FieldLabel htmlFor='resume'>
          Currículo (PDF) <span className='text-destructive'>*</span>
        </FieldLabel>
        <Input
          id='resume'
          name='resume'
          type='file'
          accept='application/pdf'
          required
          disabled={sending}
        />
      </Field>

      <FieldGroup className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4'>
        <Field>
          <FieldLabel htmlFor='portfolioUrl'>Portfólio / GitHub</FieldLabel>
          <Input
            id='portfolioUrl'
            name='portfolioUrl'
            type='url'
            placeholder='https://...'
            disabled={sending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor='linkedinUrl'>LinkedIn</FieldLabel>
          <Input
            id='linkedinUrl'
            name='linkedinUrl'
            type='url'
            placeholder='https://linkedin.com/in/...'
            disabled={sending}
          />
        </Field>
      </FieldGroup>

      <FieldGroup className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4'>
        <Field>
          <FieldLabel htmlFor='lastJobTitle'>
            Última experiência (cargo)
          </FieldLabel>
          <Input
            id='lastJobTitle'
            name='lastJobTitle'
            placeholder='Ex: Desenvolvedor Frontend Pleno'
            disabled={sending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor='experienceYears'>
            Tempo de experiência (anos)
          </FieldLabel>
          <Input
            id='experienceYears'
            name='experienceYears'
            type='number'
            placeholder='Ex: 3'
            min={0}
            max={60}
            disabled={sending}
          />
        </Field>
      </FieldGroup>

      <Field>
        <FieldLabel htmlFor='message'>Mensagem</FieldLabel>
        <Textarea
          id='message'
          name='message'
          rows={4}
          maxLength={2000}
          placeholder='Conte um pouco sobre você e por que quer trabalhar com a gente'
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={sending}
        />
        <p className='text-xs text-muted-foreground text-right'>
          {message.length}/2000
        </p>
      </Field>

      <Field orientation='horizontal'>
        <Checkbox
          id='consent'
          checked={consent}
          onCheckedChange={(checked) => setConsent(checked === true)}
          disabled={sending}
        />
        <FieldLabel htmlFor='consent' className='text-sm font-normal'>
          Concordo com o uso dos meus dados para fins de recrutamento, conforme
          a LGPD.
        </FieldLabel>
      </Field>
      {!consent && <FieldError>Necessário para enviar</FieldError>}

      <Button type='submit' disabled={sending || !consent}>
        {sending ? 'Enviando...' : 'Enviar candidatura'}
      </Button>
    </form>
  )
}
