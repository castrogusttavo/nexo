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
import { PostMortemProps } from '@/types/mail'
import { EmailFooter } from './_components/email-footer'

const EMPTY_RESUME: string[] = []

export const PostMortem = ({
  incidentTitle,
  incidentDate,
  incidentId,
  resume = EMPTY_RESUME,
  redirectUrl,
}: PostMortemProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className='bg-[#f4f5f5] font-sans py-6'>
        <Preview>
          Nexo | {incidentTitle} · {incidentId}
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
              <strong>Uma nota rápida da equipe Nexo</strong>
            </Text>
            {resume.map((paragraph) => (
              <Text
                key={paragraph}
                className='text-[14px] leading-6.5 font-light'
              >
                {paragraph}
              </Text>
            ))}
            <Text className='text-[14px] leading-6.5 font-light'>
              {incidentDate}
            </Text>
          </Section>
          <Section className='my-5'>
            <Button
              className='rounded-sm py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold'
              style={{ width: '-webkit-fill-available' }}
              href={redirectUrl}
            >
              Ler nota completa
            </Button>
          </Section>
          <Section>
            <Text className='text-[14px] leading-6.5 font-light'>
              Tem dúvidas? Responda este email, nossa equipe lê tudo.
            </Text>
          </Section>
          <EmailFooter/>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default PostMortem
