import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

interface WelcomeEmailProps {
  userFirstname: string;
}

const baseUrl = "http://localhost:3000"

export const WelcomeEmail = ({
  userFirstname,
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className="bg-white">
        <Preview>
          The sales intelligence platform that helps you uncover qualified
          leads.
        </Preview>
        <Container className="mx-auto py-5 pb-12">
          <Img
            src="https://raw.githubusercontent.com/StratusTI/SteelElo/refs/heads/main/public/logo.png"
            width="135"
            height="40"
            alt="Elo"
            className="mx-auto"
          />
          <Text className="text-[16px] leading-6.5">
            Hi {userFirstname},
          </Text>
          <Text className="text-[16px] leading-6.5">
            Welcome to Elo, the sales intelligence platform that helps you
            uncover qualified leads and close deals faster.
          </Text>
          <Section className="text-center">
            <Button
              className="bg-[#5F51E8] rounded-[3px] text-white text-[16px] no-underline text-center block p-3"
              href="https://stratustelecom.com.br"
            >
              Get started
            </Button>
          </Section>
          <Text className="text-[16px] leading-6.5">
            Best,
            <br />
            The Stratus team
          </Text>
          <Hr className="border-[#cccccc] my-5" />
          <Text className="text-[#8898aa] text-[12px]">
            470 Noor Ave STE B #1148, South San Francisco, CA 94080
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default WelcomeEmail;
