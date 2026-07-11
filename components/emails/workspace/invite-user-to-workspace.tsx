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
import { EmailFooter } from '../_components/email-footer'

export const InviteUserToWorkspace = ({
  inviterEmail,
  inviterName,
  redirectUrl,
  workspaceName,
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
                <Img
                  className='rounded-full'
                  width={64}
                  height={64}
                  src={
                    inviterImage ||
                    `${baseEmailUrl}/static/base-inviter-image.png`
                  }
                  alt={inviterName}
                />
              </Column>
              <Column align='center'>
                <Img
                  className='rounded-full invert'
                  width={24}
                  height={24}
                  src={`${baseEmailUrl}/static/arrow-invitation.png`}
                  alt='Arrow indicating invitation'
                />
              </Column>
              <Column align='left'>
                <Img
                  className='rounded-full'
                  width={64}
                  height={64}
                  src={
                    workspaceImage ||
                    `${baseEmailUrl}/static/base-workspace-image.png`
                  }
                  alt={workspaceName}
                />
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
