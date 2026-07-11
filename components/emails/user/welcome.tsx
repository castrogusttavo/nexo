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
import { WelcomeEmailProps } from '@/types/mail'
import { EmailFooter } from '../_components/email-footer'

export const WelcomeEmail = ({
  username,
  redirectUrl,
  trialDays,
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className='bg-[#f4f5f5] font-sans py-6'>
        <Preview>Nexo | Seu workspace está pronto</Preview>
        <Container className='bg-white mx-auto py-10 px-6 max-w-140'>
          <Img
            className='w-30 h-auto mb-10'
            src={`${baseEmailUrl}/brand/logo-email.png`}
            alt='Nexo'
          />
          <Section>
            <Text className='text-2xl leading-6.5'>
              <strong>Seu workspace está pronto, {username}.</strong>
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              Seu trial de{' '}
              <strong className='font-semibold'>{trialDays} dias</strong> do
              plano Business está ativo, sem cartão e sem cobrança automática.
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              Para começar, adicione algo que você já está trabalhando: um
              projeto, uma task ou até uma ideia.
            </Text>
            <Text className='text-[14px] leading-6.5 font-light mb-9'>
              É a partir disso que o Nexo começa a organizar tudo para você.
            </Text>
            <Button
              className='rounded-sm py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold'
              style={{ width: '-webkit-fill-available' }}
              href={redirectUrl}
            >
              Começar meu primeiro item
            </Button>
          </Section>
          <Section>
            <Text className='text-[14px] leading-6.5 font-light'>
              Tem dúvidas? Responda este email, nossa equipe lê tudo.
            </Text>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default WelcomeEmail
