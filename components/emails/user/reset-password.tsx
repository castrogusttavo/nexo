import {
  Body,
  Container,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
  Head,
  Hr,
  Button,
  Img,
  Link,
} from 'react-email';
import { baseEmailUrl } from '@/lib/base-email-url';
import { ResetPasswordEmailProps } from '@/types/mail';

export const ResetPasswordEmail = ({
  username,
  redirectUrl,
}: ResetPasswordEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className="bg-white font-sans">
        <Preview>
          Nexo | Redefina sua senha
        </Preview>
        <Container className="mx-auto py-10 px-6 max-w-140">
          <Img
            width={120}
            height={33.8}
            className='mx-auto mb-10'
            src={`${baseEmailUrl}/brand/logo.png`}
            alt="Nexo"
          />
          <Section>
            <Text className='text-lg leading-6.5'>
              <strong>Redefina sua senha</strong>
            </Text>
            <Text className='text-[16px] leading-6.5 font-light'>
              Olá, {username}! Recebemos um pedido para redefinir a senha da sua conta. É só clicar no botão abaixo para criar uma nova senha. O link é válido pelos próximos 30 minutos.
            </Text>
          </Section>
          <Section className='my-5 text-center'>
            <Button
              href={redirectUrl}
              className='w-full rounded-md py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold'
            >
              Redefinir senha
            </Button>
          </Section>
          <Section>
            <Text className="text-[16px] leading-6.5 font-light">
              Não foi você? Pode ignorar sem problemas — sua senha continuará a mesma.
            </Text>
            <Hr className="border-[#cccccc] my-5" />
            <Text className="text-zinc-600 text-[13px]">
              Nexo ·
              <Link href="https://nexo.coodee.dev">
                nexo.coodee.dev
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default ResetPasswordEmail;
