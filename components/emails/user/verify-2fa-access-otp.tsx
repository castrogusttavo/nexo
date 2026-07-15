import {
  Body,
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
import { Verify2faAccessOtpProps } from '@/types/mail'
import { EmailFooter } from '../_components/email-footer'

export const Verify2faAccessOtp = ({
  validationCode = '123456'
}: Verify2faAccessOtpProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className='bg-[#f4f5f5] font-sans py-6'>
        <Preview>Nexo | Seu código de acesso</Preview>
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
              <strong>Seu código de acesso ao Nexo</strong>
            </Text>
            <Text className='bg-[#f4f5f5] w-fit p-3 text-lg text-center  uppercase tracking-widest'>
              {validationCode.length === 6
                ? `${validationCode.slice(0, 3)}-${validationCode.slice(3)}`
                : validationCode}
            </Text>
          </Section>
          <Section>
            <Text className='text-[14px] leading-6.5 font-light'>
              Detectamos uma tentativa de login na sua conta com verificação em
              duas etapas. Use o código abaixo para concluir o acesso. Ele é
              válido pelos próximos 5 minutos.
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              Não foi você? Recomendamos trocar sua senha imediatamente e revise
              os dispositivos conectados.
            </Text>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default Verify2faAccessOtp
