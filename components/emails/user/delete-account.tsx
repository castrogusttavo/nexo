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
import { baseEmailUrl } from '@/lib/base-email-url';
import { DeleteAccountProps } from '@/types/mail';

export const DeleteAccount = ({
  username,
  scheduledDeletionDate,
  redirectUrl
}: DeleteAccountProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className="bg-white font-sans">
        <Preview>
          Nexo | Sua conta será excluída em {scheduledDeletionDate}
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
            <strong>Sua conta foi marcada para exclusão, {username}.</strong>
          </Text>
          <Text className='text-[16px] leading-6.5 font-light'>
            Recebemos seu pedido. A partir de <strong className='font-semibold'>{scheduledDeletionDate}</strong>, sua conta e todos os dados associados serão excluídos permanentemente.
          </Text>
          <Text className='text-[16px] leading-6.5 font-light'>
            Mudou de ideia? Você pode cancelar a exclusão a qualquer momento antes dessa data — basta clicar no botão abaixo.
          </Text>
          <Button className='w-full rounded-md py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold' href={redirectUrl}>
            Cancelar exclusão
          </Button>
          <Text className='text-[16px] leading-6.5 font-light'>
            Depois de {scheduledDeletionDate}, não conseguiremos mais recuperar sua conta.
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

export default DeleteAccount;
