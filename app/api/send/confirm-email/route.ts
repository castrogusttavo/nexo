import { Resend } from 'resend'
import ConfirmEmail from '@/components/emails/confirm-email'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    const { data } = await resend.emails.send({
      from: 'nexo <suporte@coodee.dev>',
      to: [email],
      subject: 'Confirm your email',
      react: ConfirmEmail({ validationCode: 'DJZ-TLX' }),
    })

    return Response.json(data)
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
