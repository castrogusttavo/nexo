import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from 'react-email'
import { baseEmailUrl } from '@/lib/base-email-url'
import { InactiveUserProps } from '@/types/mail'
import { EmailFooter } from '../_components/email-footer'

export const InactiveUser = ({
  username,
  redirectUrl,
}: InactiveUserProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className='bg-[#f4f5f5] font-sans py-6'>
        <Preview>Nexo | Ficou algo pendente por aqui?</Preview>
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
              <strong>Senti sua falta por aqui, {username}.</strong>
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              Você entrou no Nexo, mas não chegou a usar de verdade ainda.
              <br />
              Normal, começar do zero sempre trava.
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              Comece com algo simples:
            </Text>
            <Row>
              <Column>
                <Text className='text-[14px] leading-6.5 font-light'>
                  <strong className='font-semibold'>1.</strong> Crie 1 projeto
                </Text>
              </Column>
              <Column>
                <Text className='text-[14px] leading-6.5 font-light'>
                  <strong className='font-semibold'>2.</strong> Adicione 1 task
                </Text>
              </Column>
              <Column>
                <Text className='text-[14px] leading-6.5 font-light'>
                  <strong className='font-semibold'>3.</strong> Pare por aí
                </Text>
              </Column>
            </Row>
            <Text className='text-[14px] leading-6.5 font-light'>
              O resto o Nexo organiza por você.
            </Text>
          </Section>
          <Section className='my-5'>
            <Button
              className='rounded-sm py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold'
              style={{ width: '-webkit-fill-available' }}
              href={redirectUrl}
            >
              Voltar pro Nexo
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

export default InactiveUser
