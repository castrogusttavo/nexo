import { Resend } from 'resend'
import ConfirmEmail from '@/components/emails/confirm-email'
import { RESEND_API_KEY } from '@/lib/env/env/server'

export async function POST(request: Request) {
  try {
    const resend = new Resend(RESEND_API_KEY)
    const { email } = await request.json()

    const { data, error } = await resend.emails.send({
      from: 'nexo <suporte@nexo.coodee.dev>',
      to: [email],
      subject: 'Confirm your email',
      react: ConfirmEmail({ validationCode: 'DJZ-TLX' }),
    })

    if (error) {
      return Response.json({ error }, { status: 400 })
    }

    return Response.json(data)
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
