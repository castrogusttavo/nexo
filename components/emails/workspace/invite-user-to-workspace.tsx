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
import { InviteUserToWorkspaceProps } from '@/types/mail'
import { EmailAvatar } from '../_components/email-avatar'
import { EmailFooter } from '../_components/email-footer'

export const InviteUserToWorkspace = ({
  inviterEmail = 'ana@empresa.com',
  inviterName = 'Ana Silva',
  redirectUrl = 'https://nexo.coodee.dev/invite/token',
  workspaceName = 'Acme',
  inviterImage,
  workspaceImage,
}: InviteUserToWorkspaceProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className='bg-[#f4f5f5] font-sans py-6'>
        <Preview>Nexo | Junte-se à {inviterName}.</Preview>
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
              <strong>Junte-se à {workspaceName} no Nexo.</strong>
            </Text>
            <Text className='text-[14px] leading-6.5 font-light'>
              {inviterName} (
              <Link href={`mailto:${inviterEmail}`}>{inviterEmail}</Link>)
              convidou você para a equipe{' '}
              <strong className='font-semibold'>{workspaceName}</strong> no{' '}
              <strong className='font-semibold'>Nexo</strong>.
            </Text>
          </Section>
          <Section className='my-8'>
            <Row>
              <Column align='right'>
                <EmailAvatar src={inviterImage} name={inviterName} />
              </Column>
              <Column align='center'>
                {/* biome-ignore lint/a11y/noSvgWithoutTitle: purely decorative */}
                <svg
                  width='24'
                  height='24'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M5 12h14M13 6l6 6-6 6'
                    stroke='#94a3b8'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </Column>
              <Column align='left'>
                <EmailAvatar src={workspaceImage} name={workspaceName} />
              </Column>
            </Row>
          </Section>
          <Section className='my-5'>
            <Button
              className='rounded-sm py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold'
              style={{ width: '-webkit-fill-available' }}
              href={redirectUrl}
            >
              Junte-se à equipe
            </Button>
          </Section>
          <Section>
            <Text className='text-[14px] leading-6.5 font-light'>
              Ou copie e cole essa URL no seu navegador:{' '}
              <Link href={redirectUrl}>{redirectUrl}</Link>
            </Text>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default InviteUserToWorkspace
