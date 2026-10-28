import { type WebFaqItem, WebFaqSection } from '../_components/web-faq-section'

const PRICING_FAQ_ITEMS: WebFaqItem[] = [
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

export function PricingFaq() {
  return (
    <WebFaqSection
      title='O que podemos responder por você hoje?'
      subtitle='Qualquer coisa que não foi respondida aqui, manda pra suporte@nexopm.com, e alguém do nosso time responde.'
      items={PRICING_FAQ_ITEMS}
    />
  )
}
