import {
  Body,
  Container,
  Head,
  Hr,
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

export const Verify2faAccessOtp = ({
  validationCode,
}: Verify2faAccessOtpProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className='bg-white font-sans'>
        <Preview>Nexo | Seu código de acesso</Preview>
        <Container className='mx-auto py-10 px-6 max-w-140'>
          <Img
            width={120}
            height={33.8}
            className='mx-auto mb-10'
            src={`${baseEmailUrl}/brand/logo.png`}
            alt='Nexo'
          />
          <Section>
            <Text className='text-lg leading-6.5'>
              <strong>Seu código de acesso ao Nexo</strong>
            </Text>
            <Text className='text-[16px] leading-6.5 font-light'>
              Detectamos uma tentativa de login na sua conta com verificação em
              duas etapas. Use o código abaixo para concluir o acesso. Ele é
              válido pelos próximos 5 minutos.
            </Text>
          </Section>
          <Section className='bg-[#c2e2f5] rounded-md my-3 p-1.5'>
            <Text className='text-2xl text-center font-medium uppercase tracking-widest'>
              {validationCode.length === 6
                ? `${validationCode.slice(0, 3)}-${validationCode.slice(3)}`
                : validationCode}
            </Text>
          </Section>
          <Section>
            <Text className='text-[16px] leading-6.5 font-light'>
              Não foi você? Recomendamos trocar sua senha imediatamente e revisar
              os dispositivos conectados.
            </Text>
            <Hr className='border-[#cccccc] my-5' />
            <Text className='text-zinc-600 text-[13px]'>
              Nexo ·
              <Link href='https://nexo.coodee.dev'>nexo.coodee.dev</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default Verify2faAccessOtp
