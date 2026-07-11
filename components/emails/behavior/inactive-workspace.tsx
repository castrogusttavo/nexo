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
import { InactiveWorkspaceProps } from '@/types/mail'
import { EmailFooter } from '../_components/email-footer'

export const InactiveWorkspace = ({
  username,
  redirectUrl,
}: InactiveWorkspaceProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className='bg-[#f4f5f5] font-sans py-6'>
        <Preview>Nexo | Seu workspace ainda não começou</Preview>
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
              <strong>Seu workspace ainda está vazio, {username}.</strong>
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              E enquanto ele estiver assim, o Nexo não tem como te ajudar.
              <br />
              Não precisa estruturar nada perfeito.
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              Começe com algo simples:
            </Text>
            <Row>
              <Column>
                <Text className='text-[14px] leading-6.5 font-light'>
                  <strong className='font-semibold'>1.</strong> Uma ideia
                </Text>
              </Column>
              <Column>
                <Text className='text-[14px] leading-6.5 font-light'>
                  <strong className='font-semibold'>2.</strong> Uma task
                </Text>
              </Column>
              <Column>
                <Text className='text-[14px] leading-6.5 font-light'>
                  <strong className='font-semibold'>3.</strong> Um projeto
                  qualquer
                </Text>
              </Column>
            </Row>
            <Text className='text-[14px] leading-6.5 font-light'>
              Só isso já é suficiente pra destravar tudo.
            </Text>
          </Section>
          <Section className='my-5'>
            <Button
              className='rounded-sm py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold'
              style={{ width: '-webkit-fill-available' }}
              href={redirectUrl}
            >
              Adicionar meu primeiro item
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

export default InactiveWorkspace
