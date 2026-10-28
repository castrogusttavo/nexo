import { type WebFaqItem, WebFaqSection } from '../_components/web-faq-section'

const SWITCH_FAQ_ITEMS: WebFaqItem[] = [
  {
    question:
      'Como sabemos se o Nexo se encaixa no jeito que nosso time trabalha?',
    answer:
      'Comece pela comparação com a sua ferramenta atual, depois teste um projeto representativo no Nexo. Confira os estados, campos, views, permissões e integrações que o seu time usa antes de planejar uma migração maior.',
  },
  {
    question: 'O que vamos precisar configurar no Nexo?',
    answer:
      'Planeje configurar e testar workflows, permissões, views, dashboards, automações e integrações no Nexo. Valide a configuração com quem usa isso no dia a dia.',
  },
  {
    question: 'Podemos testar um projeto antes de migrar o time inteiro?',
    answer:
      'Sim. Use um projeto piloto pra validar seus dados, testar workflows e estimar o tempo necessário pra migração maior. Mantenha sua ferramenta atual disponível durante essa avaliação.',
  },
  {
    question: 'Podemos manter o Nexo na nossa própria infraestrutura?',
    answer:
      'Hoje o Nexo roda 100% na nuvem. Self-hosted e air-gapped estão no nosso roadmap — fale com a gente se isso for um requisito pro seu time.',
  },
  {
    question: 'O Nexo ajuda com uma migração mais complexa?',
    answer:
      'Sim. Conta pra gente o seu setup atual, os workflows necessários e as necessidades de hospedagem, e a gente ajuda a planejar a migração e escolher o plano certo.',
  },
  {
    question: 'E se ainda estamos pagando pela nossa ferramenta atual?',
    answer:
      'Fale com o nosso time de vendas sobre o seu contrato atual — a gente vê juntos o que faz sentido pra sua migração. Dá pra avaliar o Nexo enquanto essa conversa acontece.',
  },
  {
    question: 'Podemos levar nossos dados se sairmos do Nexo?',
    answer:
      'Sim. Exporte seus itens de trabalho e páginas quando quiser — você não fica preso à gente.',
  },
]

export function SwitchFaq() {
  return (
    <WebFaqSection
      title='Perguntas frequentes'
      subtitle='O que checar, o que migra e como trazer seu time pro Nexo.'
      items={SWITCH_FAQ_ITEMS}
    />
  )
}
