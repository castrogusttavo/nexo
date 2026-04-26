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
import { ExportDataProps } from '@/types/mail';

export const ExportData = ({
  username,
  downloadUrl,
  expiresAt,
  fileSize,
}: ExportDataProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className="bg-white font-sans">
        <Preview>
          Nexo | Seus dados estão prontos para download
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
            <strong>Seus dados estão prontos, {username}.</strong>
          </Text>
          <Text className='text-[16px] leading-6.5 font-light'>
            Empacotamos tudo que você criou no Nexo em um único arquivo{fileSize ? <> de <strong className='font-semibold'>{fileSize}</strong></> : null} — projetos, tasks, ideias e anexos.
          </Text>
          <Text className='text-[16px] leading-6.5 font-light'>
            O link abaixo é válido até <strong className='font-semibold'>{expiresAt}</strong>. Depois disso, você precisará gerar uma nova exportação.
          </Text>
          <Button className='w-full rounded-md py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold' href={downloadUrl}>
            Baixar meus dados
          </Button>
          <Text className='text-[16px] leading-6.5 font-light'>
            Por segurança, esse link é pessoal — não compartilhe com ninguém.
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

export default ExportData;
