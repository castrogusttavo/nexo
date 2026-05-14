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
import { InactiveWorkspaceProps } from '@/types/mail';

export const InactiveWorkspace = ({
  username,
  redirectUrl,
}: InactiveWorkspaceProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className="bg-white font-sans">
        <Preview>
          Nexo | Seu workspace ainda não começou
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
            <strong>Seu workspace ainda está vazio, {username}.</strong>
          </Text>
          <Text className='text-[16px] leading-6.5 font-light'>
            E enquanto ele estiver assim, o Nexo não tem como te ajudar.
            <br />
            Não precisa estruturar nada perfeito.
          </Text>
          <Text className='text-[16px] leading-6.5 font-light'>
            Começe com algo simples:
          </Text>
          <Row>
            <Column>
              <Text className='text-[16px] leading-6.5 font-light'>
                <strong className='font-semibold'>1.</strong> Uma ideia
              </Text>
            </Column>
            <Column>
              <Text className='text-[16px] leading-6.5 font-light'>
                <strong className='font-semibold'>2.</strong> Uma task
              </Text>
            </Column>
            <Column>
              <Text className='text-[16px] leading-6.5 font-light'>
                <strong className='font-semibold'>3.</strong> Um projeto qualquer
              </Text>
            </Column>
          </Row>
          <Text className='text-[16px] leading-6.5 font-light'>
            Só isso já é suficiente pra destravar tudo.
          </Text>
          <Button className='w-full rounded-md py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold' href={redirectUrl}>
            Adicionar meu primeiro item
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

export default InactiveWorkspace;
