import {
  Body,
  Container,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
  Head,
  Img,
  Link,
  Hr,
} from 'react-email';
import { baseEmailUrl } from '@/lib/base-email-url';
import { VerifyEmailOtpProps } from '@/types/mail';

export const VerifyEmailWithOtp = ({
  validationCode
}: VerifyEmailOtpProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className="bg-white font-sans">
        <Preview>
          Nexo | Confirme seu e-mail
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
              <strong>Confirme seu endereço de e-mail</strong>
            </Text>
            <Text className='text-[16px] leading-6.5 font-light'>
              É só digitar o código abaixo na janela do seu navegador e entrar na sua conta. Ele é válido pelos próximos 5 minutos.
            </Text>
          </Section>
          <Section className='bg-[#c2e2f5] rounded-md my-3 py-1.5 px-1.5'>
            <Text className='text-2xl text-center font-medium uppercase tracking-widest'>
              {validationCode.length === 6
                ? `${validationCode.slice(0, 3)}-${validationCode.slice(3)}`
                : validationCode}
            </Text>
          </Section>
          <Section>
            <Text className="text-[16px] leading-6.5 font-light">
              Não foi você? Pode ignorar sem problemas.
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

export default VerifyEmailWithOtp;
