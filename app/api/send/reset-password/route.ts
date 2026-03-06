import { Resend } from 'resend'
import ResetPasswordEmail from '@/components/emails/reset-password'

export async function POST(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { email } = await request.json()

    const { data } = await resend.emails.send({
      from: 'nexo <suporte@coodee.dev>',
      to: [email],
      subject: 'Reset Password',
      react: ResetPasswordEmail({
        userFirstname: 'Alan',
        resetPasswordLink: 'https://www.dropbox.com',
      }),
    })

    return Response.json(data)
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
