import { TalkToSalesEmailProps } from "@/types/mail";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from 'react-email'

export const TalkToSalesEmail = ({
  name = 'Ana Silva',
  email = 'ana@empresa.com',
  teamSize = '11-50',
  message = 'Queremos avaliar o Enterprise'
}: TalkToSalesEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className="bg-[#f4f5f5] font-sans py-6">
        <Preview>Novo contato de vendas - {name}</Preview>
        <Container className="bg-white mx-auto py-10 px-6 max-w-140">
          <Text className="text-lg font-semibold">Novo contato de vendas</Text>
          <Hr />
          <Section>
            <Text className="text-sm">
              <strong>Nome:</strong> {name}
            </Text>
            <Text className="text-sm">
              <strong>E-mail:</strong> {email}
            </Text>
            <Text className="text-sm">
              <strong>Tamanho da equipe:</strong> {teamSize}
            </Text>
            <Text className="text-sm">
              <strong>Mensagem:</strong>
            </Text>
            <Text className="text-sm whitespace-pre-line">
              {message}
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default TalkToSalesEmail
