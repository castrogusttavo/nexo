import {
  Body,
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
import type { TalkToSalesEmailProps } from '@/types/mail'
import { EmailFooter } from '../_components/email-footer'

export const TalkToSalesEmail = ({
  name = 'Ana Silva',
  email = 'ana@empresa.com',
  teamSize = '11-50',
  message = 'Queremos avaliar o Enterprise',
}: TalkToSalesEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className='bg-[#f4f5f5] font-sans py-6'>
        <Preview>Novo contato de vendas - {name}</Preview>
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
              <strong>Novo contato de vendas</strong>
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              {name} (<Link href={`mailto:${email}`}>{email}</Link>) preencheu
              o formulário de vendas pelo site.
            </Text>
          </Section>
          <Section className='my-8'>
            <Text className='text-[14px] leading-6.5'>
              <strong className='font-semibold'>Tamanho da equipe:</strong>{' '}
              {teamSize}
            </Text>
            <Text className='text-[14px] leading-6.5'>
              <strong className='font-semibold'>Mensagem:</strong>
            </Text>
            <Text className='text-[14px] leading-6.5 font-light whitespace-pre-line'>
              {message}
            </Text>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default TalkToSalesEmail
