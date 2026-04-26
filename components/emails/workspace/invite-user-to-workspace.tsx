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
  Link,
  Row,
  Column,
  Section,
  Hr
} from 'react-email';
import { baseEmailUrl } from '@/lib/base-email-url';
import { InviteUserToWorkspaceProps } from '@/types/mail';

export const InviteUserToWorkspace = ({
  inviterEmail,
  inviterName,
  redirectUrl,
  workspaceName,
  inviterImage,
  workspaceImage
}: InviteUserToWorkspaceProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className="bg-white font-sans">
        <Preview>
          Nexo | Junte-se à {inviterName}.
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
            <strong>Junte-se à {workspaceName} no Nexo.</strong>
          </Text>
          <Section>
            <Text className="text-[16px] leading-6.5 font-light">
              {inviterName} (<Link href={`mailto:${inviterEmail}`}>{inviterEmail}</Link>) convidou você para a equipe <strong className='font-semibold'>{workspaceName}</strong> no <strong className='font-semibold'>Nexo</strong>.
            </Text>
          </Section>
          <Section className='my-8'>
            <Row>
              <Column align='right'>
                <Img
                  className='rounded-full'
                  width={64}
                  height={64}
                  src={inviterImage || `${baseEmailUrl}/static/base-inviter-image.png`}
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
                  src={workspaceImage || `${baseEmailUrl}/static/base-workspace-image.png`}
                  alt={workspaceName}
                />
              </Column>
            </Row>
          </Section>
          <Button className='w-full rounded-md py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold' href={redirectUrl}>
            Junte-se à equipe
          </Button>
          <Text className="text-[16px] leading-6.5 font-light">
            Ou copie e cole essa URL no seu navegador: <Link href={redirectUrl}>{redirectUrl}</Link>
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

export default InviteUserToWorkspace;
