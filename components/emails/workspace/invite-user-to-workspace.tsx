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
          <Section className='bg-[#f4f5f5] p-8'>
            <Text className='text-slate-500 text-[14px] pb-10'>
              Nexo software, Inc.
            </Text>
            <table width='100%' cellPadding={0} cellSpacing={0} role='presentation' style={{ borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td align='right'>
                    <Link href='https://www.linkedin.com/company/nexopowers/' style={{ display: 'inline-block', paddingLeft: '24px' }}>
                      <img
                        src='https://ci3.googleusercontent.com/meips/ADKq_NYuf_vJfkLCG5AaYBuFtigAuczKEtIcPnS712S4Ioze5OmlwwBeOfQaSotsz9FwyfxA056u-rlHwDkK2eByqeYrx_T-9t2CslV1y39NAyOww0HKFC2i-Iiel-oS2oGDZj2vsG25m4psLMMLVVVKJLvEnw=s0-d-e1-ft#https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/linkedin_32px.png'
                        width='24'
                        height='24'
                        alt='LinkedIn'
                      />
                    </Link>
                    <Link href='https://github.com/nexopowers' style={{ display: 'inline-block', paddingLeft: '24px' }}>
                      <img
                        src='https://ci3.googleusercontent.com/meips/ADKq_NZPWq9KOeEOVXiyOnt6d9ZXZc3_ne1Lot5y3X2fegDo4igrMm0f1paZE1IkMir0l4hzjryn6E12-VWHgdRL_hWu4sybQw9HRUj2xmonxSOZmnD2YaZrAV_jsDNNpY_bgQtqVt5L0m51_D5ZCsZlyJc=s0-d-e1-ft#https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/github_32px.png'
                        width='24'
                        height='24'
                        alt='GitHub'
                      />
                    </Link>
                    <Link href='https://x.com/nexopowers' style={{ display: 'inline-block', paddingLeft: '24px' }}>
                      <img
                        src='https://ci3.googleusercontent.com/meips/ADKq_NZvYQs2jXqDjp6O5M62lSlCMjgQgMSpfO75cd3v988cX7AFCqWMR371NXMh9m7nx-tX-XYlbhxq7EoIc4uVSZIfNtMVOE9r7mFAw5QSc1NG42SqfvqlcbCgnLV_LBIpOlPxcemxFXG17spLWRcVlfD1=s0-d-e1-ft#https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/twitter_32px.png'
                        width='24'
                        height='24'
                        alt='Twitter/X'
                      />
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default InviteUserToWorkspace
