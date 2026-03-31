import { Resend } from 'resend'
import InviteUserEmail from '@/components/emails/invite-user'
import { RESEND_API_KEY } from '@/lib/env/server'

const baseUrl = 'http://localhost:3000'

export async function POST(request: Request) {
  try {
    const resend = new Resend(RESEND_API_KEY)
    const { email } = await request.json()

    const { data, error } = await resend.emails.send({
      from: 'nexo <suporte@nexo.coodee.dev>',
      to: [email],
      subject: 'Received your invitation',
      react: InviteUserEmail({
        username: 'alanturing',
        userImage: `${baseUrl}/static/vercel-user.png`,
        invitedByUsername: 'Alan',
        invitedByEmail: 'alan.turing@example.com',
        teamName: 'Enigma',
        teamImage: `${baseUrl}/static/vercel-team.png`,
        inviteLink: 'https://vercel.com',
        inviteFromIp: '204.13.186.218',
        inviteFromLocation: 'São Paulo, Brazil',
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
