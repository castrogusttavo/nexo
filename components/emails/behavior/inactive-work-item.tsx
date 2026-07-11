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
import { InactiveWorkItemProps } from '@/types/mail'
import { EmailFooter } from '../_components/email-footer'

export const InactiveWorkItem = ({
  username,
  redirectUrl,
}: InactiveWorkItemProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className='bg-[#f4f5f5] font-sans py-6'>
        <Preview>Nexo | Você já começou, falta pouco agora</Preview>
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
              <strong>Você começou algo no Nexo, {username}.</strong>
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              E isso já é mais do que a maioria faz.
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              Agora vem a parte onde o Nexo realmente começa a ajudar:
              organizar, conectar e dar contexto ao que você criou.
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              Seu próximo passo é simples:
            </Text>
            <Row>
              <Column>
                <Text className='text-[14px] leading-6.5 font-light'>
                  <strong className='font-semibold'>1.</strong> Abrir o item
                </Text>
              </Column>
              <Column>
                <Text className='text-[14px] leading-6.5 font-light'>
                  <strong className='font-semibold'>2.</strong> Continuar de
                  onde parou
                </Text>
              </Column>
            </Row>
          </Section>
          <Section className='my-5'>
            <Button
              className='rounded-sm py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold'
              style={{ width: '-webkit-fill-available' }}
              href={redirectUrl}
            >
              Continuar de onde parei
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

export default InactiveWorkItem
