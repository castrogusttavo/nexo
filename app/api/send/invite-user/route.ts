import { Resend } from 'resend'
import InviteUserEmail from '@/components/emails/invite-user'

const baseUrl = 'http://localhost:3000'

export async function POST(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { email } = await request.json()

    const { data } = await resend.emails.send({
      from: 'nexo <suporte@coodee.dev>',
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

    return Response.json(data)
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
