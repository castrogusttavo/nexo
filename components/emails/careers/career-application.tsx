import type { CareerApplicationEmailProps } from '@/types/mail'
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from 'react-email'

export const CareerApplicationEmail = ({
  jobTitle = 'Junior Frontend Engineer',
  name = 'Ana Silva',
  email = 'ana@example.com',
  phone,
  linkedinUrl,
  portfolioUrl,
  lastJobTitle,
  experienceYears,
  message,
  resumeUrl = 'https://example.com/resume.pdf',
}: CareerApplicationEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className='bg-[#f4f5f5] font-sans py-6'>
        <Preview>
          Nova candidatura - {jobTitle} - {name}
        </Preview>
        <Container className='bg-white mx-auto py-10 px-6 max-w-140'>
          <Text className='text-lg font-semibold'>Nova candidatura</Text>
          <Text className='text-sm text-muted-foreground'>{jobTitle}</Text>
          <Hr />
          <Section>
            <Text className='text-sm'><strong>Nome:</strong> {name}</Text>
            <Text className='text-sm'><strong>E-mail:</strong> {email}</Text>
            {phone && <Text className='text-sm'><strong>Telefone:</strong> {phone}</Text>}
            {linkedinUrl && <Text className='text-sm'><strong>LinkedIn:</strong> {linkedinUrl}</Text>}
            {portfolioUrl && <Text className='text-sm'><strong>Portfólio:</strong> {portfolioUrl}</Text>}
            {lastJobTitle && <Text className='text-sm'><strong>Última experiência:</strong> {lastJobTitle}</Text>}
            {experienceYears != null && (
              <Text className='text-sm'><strong>Tempo de experiência:</strong> {experienceYears} {experienceYears === 1 ? 'ano' : 'anos'}</Text>
            )}
            {message && (
              <>
                <Text className='text-sm'><strong>Mensagem:</strong></Text>
                <Text className='text-sm whitespace-pre-line'>{message}</Text>
              </>
            )}
            <Hr />
            <Text className='text-sm'>
              <Link href={resumeUrl}>Baixar currículo</Link>
            </Text>
            <Text className='text-xs text-muted-foreground'>
              Link válido por 7 dias.
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export default CareerApplicationEmail
