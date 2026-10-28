import type { ReactNode } from 'react'
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from 'react-email'
import { baseEmailUrl } from '@/lib/base-email-url'
import { EmailFooter } from './email-footer'

interface EmailNudgeProps {
  preview: string
  title: ReactNode
  /** Paragraphs before the steps, as `EmailNudgeText`. */
  children: ReactNode
  steps: ReactNode[]
  /** Paragraph after the steps, when there is one. */
  outro?: ReactNode
  cta: string
  href?: string
}

/** The behavior emails that nudge an idle user back: a few steps and one CTA. */
export const EmailNudge = ({
  preview,
  title,
  children,
  steps,
  outro,
  cta,
  href,
}: EmailNudgeProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className='bg-[#f4f5f5] font-sans py-6'>
        <Preview>{preview}</Preview>
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
              <strong>{title}</strong>
            </Text>
            {children}
            <Row>
              {steps.map((step, index) => (
                // Steps are fixed copy, so their position is the identity.
                // react-doctor-disable-next-line react-doctor/no-array-index-as-key
                <Column key={index}>
                  <EmailNudgeText>
                    <strong className='font-semibold'>{index + 1}.</strong>{' '}
                    {step}
                  </EmailNudgeText>
                </Column>
              ))}
            </Row>
            {outro && <EmailNudgeText>{outro}</EmailNudgeText>}
          </Section>
          <Section className='my-5'>
            <Button
              className='rounded-sm py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold'
              style={{ width: '-webkit-fill-available' }}
              href={href}
            >
              {cta}
            </Button>
          </Section>
          <Section>
            <EmailNudgeText>
              Tem dúvidas? Responda este email, nossa equipe lê tudo.
            </EmailNudgeText>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export const EmailNudgeText = ({ children }: { children: ReactNode }) => (
  <Text className='text-[14px] leading-6.5 font-light'>{children}</Text>
)
