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
import { EmailFooter } from '../_components/email-footer';

export const VerifyEmailWithOtp = ({
  email = 'castrogusttavo.dev@gmail.com',
  validationCode = '123456'
}: VerifyEmailOtpProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className="bg-[#f4f5f5] font-sans py-6">
        <Preview>
          Nexo | Confirme seu e-mail
        </Preview>
        <Container className="bg-white mx-auto py-10 px-6 max-w-140">
          <Img
            width={120}
            height={33.8}
            className='mb-10'
            src={`${baseEmailUrl}/brand/logo-email.png`}
            alt="Nexo"
          />
          <Section>
            <Text className='text-2xl leading-6.5'>
              <strong>Confirme seu endereço de e-mail</strong>
            </Text>
            <Text className='bg-[#f4f5f5] w-fit p-3 text-lg text-center  uppercase tracking-widest'>
              {validationCode.length === 6
                ? `${validationCode.slice(0, 3)}-${validationCode.slice(3)}`
                : validationCode}
            </Text>
          </Section>
          <Section>
            <Text className='text-[14px] leading-6.5 font-light'>
              É só digitar o código abaixo na janela do seu navegador e entrar na sua conta. Ele é válido pelos próximos 5 minutos.
            </Text>

            <Text className="text-[14px] leading-6.5 font-light">
              Este e-mail foi enviado para <Link href={`mailto:${email}`} className='bg-blue-100 py-1 px-2 rounded-md text-[11px] font-medium'>{email}</Link>. Não foi você? Pode ignorar sem problemas.
            </Text>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default VerifyEmailWithOtp;
