import {
  Body,
  Container,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
  Head,
  Hr,
  Button,
  Img,
  Link,
} from 'react-email';
import { baseEmailUrl } from '@/lib/base-email-url';
import { TrialEndPromotionProps } from '@/types/mail';

function getVariant({
  itemsCreated,
  workspaceName,
  couponCode,
  discountLabel,
}: Pick<TrialEndPromotionProps, 'itemsCreated' | 'workspaceName' | 'couponCode' | 'discountLabel'>) {
  if (itemsCreated <= 2) {
    return {
      paragraphs: [
        'Você ainda não usou o Nexo de verdade — e tudo bem.',
        <>Ele começa a fazer sentido quando você coloca algo real dentro. <br />Um projeto, uma task, uma ideia… qualquer coisa que você já está trabalhando.</>,
        'É aí que a IA, a wiki e as integrações começam a organizar tudo para você.',
        'Ainda dá tempo de testar com algo simples.',
      ],
      ctaLabel: `Começar no workspace ${workspaceName}`,
      couponLine: <>Se fizer sentido pra você, use o código {couponCode} ({discountLabel}) ao ativar.</>,
    }
  }

  if (itemsCreated <= 10) {
    return {
      paragraphs: [
        'Você já começou a usar o Nexo — e isso já faz diferença.',
        <>Hoje você tem {itemsCreated} itens organizados no workspace {workspaceName}. <br />Projetos, tarefas, ideias… tudo começando a ganhar estrutura.</>,
        'Se parar agora, esse fluxo simplesmente não evolui.',
        'Continue de onde você parou e veja isso escalar de verdade.',
      ],
      ctaLabel: 'Continuar no workspace',
      couponLine: <>Se quiser manter tudo ativo, você pode usar {couponCode} ({discountLabel}) ao fazer upgrade.</>,
    }
  }

  return {
    paragraphs: [
      'Você já construiu bastante coisa no Nexo.',
      <>Hoje são {itemsCreated} itens dentro do workspace {workspaceName}: projetos, tarefas, docs… tudo organizado e conectado.</>,
      <>Quando o trial acabar, você perde acesso à IA, wiki e integrações. <br />Na prática, tudo isso para de evoluir.</>,
      'Se isso já faz parte do seu fluxo, faz sentido continuar.',
    ],
    ctaLabel: 'Manter meu workspace ativo',
    couponLine: <>Use {couponCode} ({discountLabel}) para ativar com desconto.</>,
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
        <Body className="bg-white font-sans">
          <Preview>
            Nexo | {daysRemaining} dias restantes
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
              <strong>
                Seu trial acaba em {daysRemaining} dias, {username}
              </strong>
            </Text>
            <Section>
              {variant.paragraphs.map((paragraph, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static email content, never reordered
                <Text key={index} className='text-[16px] leading-6.5 font-light'>{paragraph}</Text>
              ))}
              <Button className='w-full rounded-md py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold'>
                {variant.ctaLabel}
              </Button>
              <Text className='text-[16px] leading-6.5 font-light'>
                {variant.couponLine}
              </Text>
            </Section>
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
};

export default TrialEndPromotion;
