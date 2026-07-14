'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
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
      <h2 className='text-2xl font-medium'>Candidate-se</h2>

      {/* Honeypot: hidden from real users via off-screen CSS (not
          display:none, which some bots skip when filling forms). */}
      <input
        type='text'
        name='honeypot'
        tabIndex={-1}
        autoComplete='off'
        className='absolute -left-[9999px] h-0 w-0 opacity-0'
        aria-hidden='true'
      />

      <Field>
        <FieldLabel htmlFor='name'>
          Nome <span className='text-destructive'>*</span>
        </FieldLabel>
        <Input id='name' name='name' required disabled={sending} />
      </Field>

      <Field>
        <FieldLabel htmlFor='email'>
          E-mail <span className='text-destructive'>*</span>
        </FieldLabel>
        <Input
          id='email'
          name='email'
          type='email'
          required
          disabled={sending}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor='phone'>Telefone</FieldLabel>
        <Input id='phone' name='phone' disabled={sending} />
      </Field>

      <Field>
        <FieldLabel htmlFor='portfolioUrl'>Portfólio / LinkedIn</FieldLabel>
        <Input
          id='portfolioUrl'
          name='portfolioUrl'
          type='url'
          placeholder='https://...'
          disabled={sending}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor='message'>Mensagem</FieldLabel>
        <Textarea id='message' name='message' rows={4} disabled={sending} />
      </Field>

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

      <Field className='flex-row items-start gap-2'>
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
