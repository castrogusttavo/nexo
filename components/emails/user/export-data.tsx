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
import { ExportDataProps } from '@/types/mail'
import { EmailFooter } from '../_components/email-footer'

export const ExportData = ({
  username,
  downloadUrl,
  expiresAt,
  fileSize,
}: ExportDataProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className='bg-[#f4f5f5] font-sans py-6'>
        <Preview>Nexo | Seus dados estão prontos para download</Preview>
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
              <strong>Seus dados estão prontos, {username}.</strong>
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              Empacotamos tudo que você criou no Nexo em um único arquivo
              {fileSize ? (
                <>
                  {' '}de <strong className='font-semibold'>{fileSize}</strong>
                </>
              ) : null}
              : projetos, tasks, ideias e anexos.
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              O link abaixo é válido até{' '}
              <strong className='font-semibold'>{expiresAt}</strong>. Depois
              disso, você precisará gerar uma nova exportação.
            </Text>
          </Section>
          <Section className='my-5'>
            <Button
              className='rounded-sm py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold'
              style={{ width: '-webkit-fill-available' }}
              href={downloadUrl}
            >
              Baixar meus dados
            </Button>
          </Section>
          <Section>
            <Text className='text-[14px] leading-6.5 font-light'>
              Por segurança, esse link é pessoal, não compartilhe com ninguém.
            </Text>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default ExportData
