import { Resend } from 'resend'
import { WelcomeEmail } from '@/components/emails/welcome'

export async function POST(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { email, username } = await request.json()

    const { data, error } = await resend.emails.send({
      from: 'nexo <suporte@coodee.dev>',
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
