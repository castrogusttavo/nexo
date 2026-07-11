import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from 'react-email'
import { baseEmailUrl } from '@/lib/base-email-url'
import { ResetPasswordEmailProps } from '@/types/mail'
import { EmailFooter } from '../_components/email-footer'

export const ResetPasswordEmail = ({
  username,
  redirectUrl,
}: ResetPasswordEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className='bg-[#f4f5f5] font-sans py-6'>
        <Preview>Nexo | Redefina sua senha</Preview>
        <Container className='bg-white mx-auto py-10 px-6 max-w-140'>
          <Img
            width={120}
            height={33.8}
            className='mb-10'
            src={`${baseEmailUrl}/brand/logo-email.png`}
            alt='Nexo'
          />
          <Section>
            <Text className='text-2xl leading-6.5'>
              <strong>Redefina sua senha</strong>
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              Olá, {username}! Recebemos um pedido para redefinir a senha da sua
              conta. É só clicar no botão abaixo para criar uma nova senha. O
              link é válido pelos próximos 30 minutos.
            </Text>
          </Section>
          <Section className='my-5'>
            <Button
              href={redirectUrl}
              className='rounded-sm py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold'
              style={{ width: '-webkit-fill-available' }}
            >
              Redefinir senha
            </Button>
          </Section>
          <Section>
            <Text className='text-[14px] leading-6.5 font-light'>
              Não foi você? Pode ignorar sem problemas, sua senha continuará a
              mesma.
            </Text>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default ResetPasswordEmail
