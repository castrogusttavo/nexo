import { Resend } from 'resend'
import { WelcomeEmail } from '@/components/emails/welcome'
import { RESEND_API_KEY } from '@/lib/env/env.d'

export async function POST(request: Request) {
  try {
    const resend = new Resend(RESEND_API_KEY)
    const { email, username } = await request.json()

    const { data, error } = await resend.emails.send({
      from: 'nexo <suporte@nexo.coodee.dev>',
      to: [email],
      subject: 'Welcome Nexo',
      react: WelcomeEmail({ userFirstname: username }),
    })

    if (error) {
      return Response.json({ error }, { status: 400 })
    }

    return Response.json(data)
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
