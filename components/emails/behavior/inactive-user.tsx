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
import { InactiveUserProps } from '@/types/mail';

export const InactiveUser = ({
  username,
  redirectUrl,
}: InactiveUserProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className="bg-white font-sans">
        <Preview>
          Nexo | Ficou algo pendente por aqui?
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
            <strong>Senti sua falta por aqui, {username}.</strong>
          </Text>
          <Text className='text-[16px] leading-6.5 font-light'>
            Você entrou no Nexo, mas não chegou a usar de verdade ainda.
            <br />
            Normal — começar do zero sempre trava.
          </Text>
          <Text className='text-[16px] leading-6.5 font-light'>
            Começe com algo simples:
          </Text>
          <Row>
            <Column>
              <Text className='text-[16px] leading-6.5 font-light'>
                <strong className='font-semibold'>1.</strong> Crie 1 projeto
              </Text>
            </Column>
            <Column>
              <Text className='text-[16px] leading-6.5 font-light'>
                <strong className='font-semibold'>2.</strong> Adicione 1 task
              </Text>
            </Column>
            <Column>
              <Text className='text-[16px] leading-6.5 font-light'>
                <strong className='font-semibold'>3.</strong> Pare por aí
              </Text>
            </Column>
          </Row>
          <Text className='text-[16px] leading-6.5 font-light'>
            O resto o Nexo organiza por você.
          </Text>
          <Button className='w-full rounded-md py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold' href={redirectUrl}>
            Voltar pro Nexo
          </Button>
          <Text className="text-[16px] leading-6.5 font-light">
            Tem dúvidas? Responda este email — nossa equipe lê tudo.
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

export default InactiveUser;
