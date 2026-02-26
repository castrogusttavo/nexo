import { Resend } from 'resend';
import { WelcomeEmail } from '@/components/emails/welcome';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    const { data } = await resend.emails.send({
      from: 'stratustelecom <suporte@stratustelecom.com.br>',
      to: [email],
      subject: 'Hello world',
      react: WelcomeEmail({ userFirstname: 'John' }),
    });

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
