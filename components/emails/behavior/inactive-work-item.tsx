import {
  Body,
  Container,
  Html,
  Preview,
  Tailwind,
  Text,
  Head,
  Button,
  Img,
  Section,
  Hr,
  Link,
  Row,
  Column,
} from 'react-email';
import { baseEmailUrl } from '@/lib/base-email-url';
import { InactiveWorkItemProps } from '@/types/mail';

export const InactiveWorkItem = ({
  username,
  redirectUrl,
}: InactiveWorkItemProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className="bg-white font-sans">
        <Preview>
          Nexo | Você já começou, falta pouco agora
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
            <strong>Você começou algo no Nexo, {username}.</strong>
          </Text>
          <Text className='text-[16px] leading-6.5 font-light'>
            E isso já é mais do que a maioria faz.
          </Text>
          <Text className='text-[16px] leading-6.5 font-light'>
            Agora vem a parte onde o Nexo realmente começa a ajudar:
            organizar, conectar e dar contexto ao que você criou.
          </Text>
          <Text className='text-[16px] leading-6.5 font-light'>
            Seu próximo passo é simples:
          </Text>
          <Row>
            <Column>
              <Text className='text-[16px] leading-6.5 font-light'>
                <strong className='font-semibold'>1.</strong> Abrir o item
              </Text>
            </Column>
            <Column>
              <Text className='text-[16px] leading-6.5 font-light'>
                <strong className='font-semibold'>2.</strong> Continuar de onde parou
              </Text>
            </Column>
          </Row>
          <Button className='w-full rounded-md py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold' href={redirectUrl}>
            Continuar de onde parei
          </Button>
          <Text className="text-[16px] leading-6.5 font-light">
            Tem dúvidas? Responda este email, nossa equipe lê tudo.
          </Text>
          <Section>
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

export default InactiveWorkItem;
