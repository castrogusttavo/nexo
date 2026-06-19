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
import { TrialEndPromotionProps } from '@/types/mail'

function getVariant({
  itemsCreated,
  workspaceName,
  couponCode,
  discountLabel,
}: Pick<
  TrialEndPromotionProps,
  'itemsCreated' | 'workspaceName' | 'couponCode' | 'discountLabel'
>) {
  if (itemsCreated <= 2) {
    return {
      paragraphs: [
        'Você ainda não usou o Nexo de verdade — e tudo bem.',
        <>
          Ele começa a fazer sentido quando você coloca algo real dentro.{' '}
          <br />
          Um projeto, uma task, uma ideia… qualquer coisa que você já está
          trabalhando.
        </>,
        'É aí que a IA, a wiki e as integrações começam a organizar tudo para você.',
        'Ainda dá tempo de testar com algo simples.',
      ],
      ctaLabel: `Começar no workspace ${workspaceName}`,
      couponLine: (
        <>
          Se fizer sentido pra você, use o código {couponCode} ({discountLabel})
          ao ativar.
        </>
      ),
    }
  }

  if (itemsCreated <= 10) {
    return {
      paragraphs: [
        'Você já começou a usar o Nexo — e isso já faz diferença.',
        <>
          Hoje você tem {itemsCreated} itens organizados no workspace{' '}
          {workspaceName}. <br />
          Projetos, tarefas, ideias… tudo começando a ganhar estrutura.
        </>,
        'Se parar agora, esse fluxo simplesmente não evolui.',
        'Continue de onde você parou e veja isso escalar de verdade.',
      ],
      ctaLabel: 'Continuar no workspace',
      couponLine: (
        <>
          Se quiser manter tudo ativo, você pode usar {couponCode} (
          {discountLabel}) ao fazer upgrade.
        </>
      ),
    }
  }

  return {
    paragraphs: [
      'Você já construiu bastante coisa no Nexo.',
      <>
        Hoje são {itemsCreated} itens dentro do workspace {workspaceName}:
        projetos, tarefas, docs… tudo organizado e conectado.
      </>,
      <>
        Quando o trial acabar, você perde acesso à IA, wiki e integrações.{' '}
        <br />
        Na prática, tudo isso para de evoluir.
      </>,
      'Se isso já faz parte do seu fluxo, faz sentido continuar.',
    ],
    ctaLabel: 'Manter meu workspace ativo',
    couponLine: (
      <>
        Use {couponCode} ({discountLabel}) para ativar com desconto.
      </>
    ),
  }
}

export const TrialEndPromotion = ({
  username,
  workspaceName,
  daysRemaining,
  couponCode,
  discountLabel,
  itemsCreated,
}: TrialEndPromotionProps) => {
  const variant = getVariant({ itemsCreated, workspaceName, couponCode, discountLabel })

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className='bg-[#f4f5f5] font-sans py-6'>
          <Preview>Nexo | {daysRemaining} dias restantes</Preview>
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
                <strong>
                  Seu trial acaba em {daysRemaining} dias, {username}
                </strong>
              </Text>
              {variant.paragraphs.map((paragraph, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static email content, never reordered
                <Text key={index} className='text-[14px] leading-6.5 font-light'>
                  {paragraph}
                </Text>
              ))}
            </Section>
            <Section className='my-5'>
              <Button
                className='rounded-sm py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold'
                style={{ width: '-webkit-fill-available' }}
              >
                {variant.ctaLabel}
              </Button>
            </Section>
            <Section>
              <Text className='text-[14px] leading-6.5 font-light'>
                {variant.couponLine}
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
}

export default TrialEndPromotion
