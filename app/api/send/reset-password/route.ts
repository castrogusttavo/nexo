import { Resend } from 'resend'
import ResetPasswordEmail from '@/components/emails/reset-password'

export async function POST(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { email } = await request.json()

    const { data, error } = await resend.emails.send({
      from: 'nexo <suporte@nexo.coodee.dev>',
      to: [email],
      subject: 'Reset Password',
      react: ResetPasswordEmail({
        userFirstname: 'Alan',
        resetPasswordLink: 'https://www.dropbox.com',
      }),
    })

    if (error) {
      return Response.json({ error }, { status: 400 })
    }

    return Response.json(data)
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
