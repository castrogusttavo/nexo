import { Resend } from 'resend'
import { WelcomeEmail } from '@/components/emails/welcome'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { email, username } = await request.json()

    const { data } = await resend.emails.send({
      from: 'nexo <suporte@coodee.dev>',
      to: [email],
      subject: 'Welcome Nexo',
      react: WelcomeEmail({ userFirstname: username }),
    })

    return Response.json(data)
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
