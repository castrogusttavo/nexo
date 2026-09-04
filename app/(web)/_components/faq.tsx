import { JsonLd } from '@/components/seo/json-ld'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Title } from './text/title'

// Fonte única: o Accordion e o schema FAQPage abaixo renderizam a partir
// deste array, pra nunca ficarem dessincronizados.
const FAQ_ITEMS = [
  {
    question: 'O que é o Nexo?',
    answer:
      'O Nexo é uma plataforma de gerenciamento de projetos que ajuda equipes a colaborar, acompanhar o progresso e entregar projetos com eficiência. Ele combina gerenciamento de projetos, wiki e formulários de solicitação em uma plataforma unificada.',
  },
  {
    question: 'O Nexo é gratuito?',
    answer:
      'Sim. O Nexo oferece um plano gratuito bastante completo com os principais recursos para até 12 usuários. Também disponibilizamos planos pagos para funcionalidades avançadas, necessidades corporativas e suporte prioritário.',
  },
  {
    question: 'Posso hospedar o Nexo na minha própria infraestrutura?',
    answer:
      'Sim. No plano Enterprise oferecemos implantações privadas e gerenciadas: o Nexo rodando na sua própria infraestrutura, com mais controle e privacidade, implantado e mantido pela nossa equipe. Fale com vendas para conhecer as opções.',
  },
  {
    question: 'Quais integrações o Nexo oferece?',
    answer:
      'O Nexo integra-se com ferramentas populares como GitHub, GitLab, Slack, Sentry e Draw.io para simplificar seu fluxo de trabalho e manter sua equipe conectada.',
  },
  {
    question: 'Como migrar de outras ferramentas de gerenciamento de projetos?',
    answer:
      'Disponibilizamos importadores para plataformas como Jira, Linear, Asana e ClickUp, além de importação via CSV. Nossa equipe também pode auxiliar durante todo o processo de migração.',
  },
  {
    question: 'Meus dados estão seguros?',
    answer:
      'A segurança é nossa prioridade. Utilizamos criptografia seguindo os padrões do setor, realizamos auditorias de segurança regularmente e adotamos boas práticas para proteger seus dados, em conformidade com a LGPD.',
  },
]

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
}

export function Faq() {
  return (
    <div className='py-16 flex flex-col gap-6 w-full pb-20'>
      <JsonLd data={FAQ_SCHEMA} />
      <Title as='h2' className='text-4xl font-medium'>
        O que podemos responder por você hoje?
      </Title>
      <Accordion className='max-w-5xl mx-auto flex flex-col'>
        {FAQ_ITEMS.map(({ question, answer }, index) => (
          <AccordionItem
            key={question}
            value={`item-${index + 1}`}
            className='data-open:bg-card p-4'
          >
            <AccordionTrigger className='text-base hover:no-underline data-open:bg-card'>
              {question}
            </AccordionTrigger>
            <AccordionContent>{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
