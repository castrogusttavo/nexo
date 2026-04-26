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
import { WelcomeEmailProps } from '@/types/mail';
import { baseEmailUrl } from '@/lib/base-email-url';

export const WelcomeEmail = ({
  username,
  redirectUrl,
  trialDays
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className="bg-white font-sans">
        <Preview>
          Nexo | Seu workspace está pronto
        </Preview>
        <Container className="mx-auto py-10 px-6 max-w-140">
          <Img
            width={120}
            height={33.8}
            className='mx-auto mb-10'
            src={`${baseEmailUrl}/brand/logo.png`}
            alt="Nexo"
          />
          <Text className='text-lg leading-6.5'>
            <strong>Seu workspace está pronto, {username}.</strong>
          </Text>
          <Text className="text-[16px] leading-6.5 font-light">
            Seu trial de <strong className='font-semibold'>{trialDays} dias</strong> do plano Business está ativo — sem cartão, sem cobrança automática.
          </Text>
          <Text className="text-[16px] leading-6.5 font-light">
            Para começar, adicione algo que você já está trabalhando —
            um projeto, uma task ou até uma ideia.
          </Text>
          <Text className="text-[16px] leading-6.5 font-light mb-9">
            É a partir disso que o Nexo começa a organizar tudo para você.
          </Text>
          <Section className="text-center my-8">
            <Button className='w-full rounded-md py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold' href={redirectUrl}>
              Começar meu primeiro item
            </Button>
          </Section>
          <Text className="text-[16px] leading-6.5 font-light">
            Tem dúvidas? Responda este email — nossa equipe lê tudo.
          </Text>
          <Hr className="border-[#cccccc] my-5" />
          <Text className="text-zinc-600 text-[13px]">
            Bem-vindo ao Nexo ·
            <Link href="https://nexo.coodee.dev">
              nexo.coodee.dev
            </Link>
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default WelcomeEmail;
