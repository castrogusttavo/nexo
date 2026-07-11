import {
  Body,
  Button,
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
import { DeleteAccountProps } from '@/types/mail'
import { EmailFooter } from '../_components/email-footer'

export const DeleteAccount = ({
  username,
  scheduledDeletionDate,
  redirectUrl,
}: DeleteAccountProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className='bg-[#f4f5f5] font-sans py-6'>
        <Preview>Nexo | Sua conta será excluída em {scheduledDeletionDate}</Preview>
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
              <strong>Sua conta foi marcada para exclusão, {username}.</strong>
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              Recebemos seu pedido. A partir de{' '}
              <strong className='font-semibold'>{scheduledDeletionDate}</strong>,
              sua conta e todos os dados associados serão excluídos
              permanentemente.
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              Mudou de ideia? Você pode cancelar a exclusão a qualquer momento
              antes dessa data, basta clicar no botão abaixo.
            </Text>
          </Section>
          <Section className='my-5'>
            <Button
              className='rounded-sm py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold'
              style={{ width: '-webkit-fill-available' }}
              href={redirectUrl}
            >
              Cancelar exclusão
            </Button>
          </Section>
          <Section>
            <Text className='text-[14px] leading-6.5 font-light'>
              Depois de {scheduledDeletionDate}, não conseguiremos mais
              recuperar sua conta.
            </Text>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default DeleteAccount
