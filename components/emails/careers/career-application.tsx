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
import type { CareerApplicationEmailProps } from '@/types/mail'
import { EmailFooter } from '../_components/email-footer'

export const CareerApplicationEmail = ({
  jobTitle = 'Junior Frontend Engineer',
  name = 'Ana Silva',
  email = 'ana@example.com',
  phone,
  linkedinUrl,
  portfolioUrl,
  lastJobTitle,
  experienceYears,
  message,
  resumeUrl = 'https://example.com/resume.pdf',
}: CareerApplicationEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className='bg-[#f4f5f5] font-sans py-6'>
        <Preview>
          Nova candidatura - {jobTitle} - {name}
        </Preview>
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
              <strong>Nova candidatura</strong>
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              {name} (<Link href={`mailto:${email}`}>{email}</Link>) se
              candidatou para a vaga de{' '}
              <strong className='font-semibold'>{jobTitle}</strong>.
            </Text>
          </Section>
          <Section className='my-8'>
            {phone && (
              <Text className='text-[14px] leading-6.5'>
                <strong className='font-semibold'>Telefone:</strong> {phone}
              </Text>
            )}
            {linkedinUrl && (
              <Text className='text-[14px] leading-6.5'>
                <strong className='font-semibold'>LinkedIn:</strong>{' '}
                <Link href={linkedinUrl}>{linkedinUrl}</Link>
              </Text>
            )}
            {portfolioUrl && (
              <Text className='text-[14px] leading-6.5'>
                <strong className='font-semibold'>Portfólio:</strong>{' '}
                <Link href={portfolioUrl}>{portfolioUrl}</Link>
              </Text>
            )}
            {lastJobTitle && (
              <Text className='text-[14px] leading-6.5'>
                <strong className='font-semibold'>Última experiência:</strong>{' '}
                {lastJobTitle}
              </Text>
            )}
            {experienceYears != null && (
              <Text className='text-[14px] leading-6.5'>
                <strong className='font-semibold'>
                  Tempo de experiência:
                </strong>{' '}
                {experienceYears} {experienceYears === 1 ? 'ano' : 'anos'}
              </Text>
            )}
            {message && (
              <>
                <Text className='text-[14px] leading-6.5'>
                  <strong className='font-semibold'>Mensagem:</strong>
                </Text>
                <Text className='text-[14px] leading-6.5 font-light whitespace-pre-line'>
                  {message}
                </Text>
              </>
            )}
          </Section>
          <Section className='my-5'>
            <Button
              href={resumeUrl}
              className='rounded-sm py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold'
              style={{ width: '-webkit-fill-available' }}
            >
              Baixar currículo
            </Button>
            <Text className='text-[13px] leading-5.5 font-light text-[#64748b] mt-3'>
              Link válido por 7 dias.
            </Text>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default CareerApplicationEmail
