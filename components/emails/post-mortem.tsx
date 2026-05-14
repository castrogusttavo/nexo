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
  Section,
  Hr,
} from 'react-email';
import { baseEmailUrl } from '@/lib/base-email-url';
import { PostMortemProps } from '@/types/mail';

const EMPTY_RESUME: string[] = [];

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
      <Body className="bg-white font-sans">
        <Preview>
          Nexo | {incidentTitle} · {incidentId}
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
            <strong>Uma nota rápida da equipe Nexo</strong>
          </Text>
          <Section>
            {resume.map((paragraph) => (
              <Text key={paragraph} className='text-[16px] leading-6.5 font-light'>{paragraph}</Text>
            ))}
          </Section>
          <Button className='w-full rounded-md py-3 px-2.5 bg-[#2893cc] text-white text-center font-semibold' href={redirectUrl}>
            Ler nota completa
          </Button>
          <Text className="text-[16px] leading-6.5 font-light">
            Tem dúvidas? Responda este email, nossa equipe lê tudo.
          </Text>
          <Section>
            <Hr className="border-[#cccccc] my-5" />
            <Text className="text-zinc-600 text-[13px]">
              Obrigado, Equipe Nexo · {incidentDate}
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default PostMortem;
