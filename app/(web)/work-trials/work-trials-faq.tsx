import { type WebFaqItem, WebFaqSection } from '../_components/web-faq-section'

const WORK_TRIALS_FAQ_ITEMS: WebFaqItem[] = [
  {
    question: 'O trial é realmente remunerado?',
    answer:
      'Sim. Toda vaga, com a taxa exata por escrito antes de você concordar com qualquer coisa, sob um acordo curto cobrindo pagamento e confidencialidade. Pagamos por todo dia agendado, seja qual for a decisão no final. Esse é o mínimo que a gente deve garantir pra pedir dias do seu tempo. Desconfie de qualquer empresa que peça trabalho de teste sem isso.',
  },
  {
    question:
      'Eu tenho um emprego em tempo integral. Como faço isso sem arriscar ele?',
    answer:
      'Do mesmo jeito que a maioria dos nossos candidatos faz. Rodamos trials à noite, nos fins de semana, ou divididos em blocos ao longo de duas semanas, ajustados ao seu fuso horário. Nunca entramos em contato com seu empregador atual, e a confidencialidade do nosso acordo protege você tanto quanto protege a gente. Uma coisa pra checar do seu lado: veja se o seu contrato atual tem alguma regra sobre trabalho remunerado externo. Se houver conflito, nos avise, e a gente estrutura em volta disso. Essa situação é comum, e temos um caminho pra ela.',
  },
  {
    question:
      'Meu visto ou meu contrato não permite trabalho remunerado externo. Estou fora?',
    answer:
      'Não. Essa é uma das situações mais comuns que vemos, e ela nunca conta contra você. Nos avise cedo, e desenhamos junto um caminho alternativo, construído na mesma ideia de trabalhar em algo real, com uma mecânica que respeite a sua limitação. O que a gente não vai fazer é pedir trabalho não remunerado por baixo do pano.',
  },
  {
    question: 'O que acontece com o trabalho que eu produzo?',
    answer:
      'O projeto existe pra ajudar os dois lados a decidir, e é dimensionado pra isso. Antes de você começar, avisamos se o seu projeto tem chance de ir pro produto de verdade. Se algo que você fez realmente entrar no Nexo, você foi pago pelo tempo que produziu aquilo, e vai ouvir isso da gente. Nunca vamos aproveitar silenciosamente o resultado de um trial: um trial que também vira trabalho grátis deixa de ser avaliação e vira exploração, e candidato percebe isso.',
  },
  {
    question: 'Quem decide, e em quanto tempo?',
    answer:
      'Todo mundo que trabalhou com você durante o trial escreve um retorno independente, e a decisão final fica com quem está conduzindo a contratação da vaga. Você recebe uma resposta em até três dias úteis depois do seu último dia. Se a resposta for sim, seguimos direto pra uma proposta. Se for não, você recebe os motivos reais, com detalhe suficiente pra ser útil em outro lugar.',
  },
  {
    question: 'Dá pra pular o trial?',
    answer:
      'O trial é a última etapa pra qualquer vaga, de quem escreve código a quem um dia vier liderar um time, em parte porque a justiça do processo depende de todo mundo passar por ele. O que é flexível é o resto: quando acontece, que formato tem, e como se encaixa na sua vida. Se agora for um momento impossível, preferimos esperar por você a perder você. Então nos avise.',
  },
  {
    question: 'Como é, na prática, um projeto de trial?',
    answer:
      'Pra vagas de engenharia, um pedaço recortado de uma feature real, levado de um primeiro plano até algo que o time consegue rodar. Pra vagas de design, um fluxo real levado do problema até a proposta, com as restrições reais mantidas. Pra vagas de go-to-market, um segmento real, uma peça de conteúdo ou uma ação, trabalhados com números reais. Em todos os casos, o projeto é terminável nos dias que você tem, e um trabalho bem pensado e finalizado vale mais que um ambicioso e incompleto.',
  },
  {
    question: 'Agentes de IA vão me avaliar?',
    answer:
      'Você vai trabalhar ao lado dos agentes que estamos construindo, do mesmo jeito que o time trabalha todo dia. A avaliação, porém, é escrita pelas pessoas que trabalharam com você. No Nexo, agentes cuidam do trabalho repetitivo, pessoas cuidam do julgamento. E decidir quem entra pro time é julgamento.',
  },
]

export function WorkTrialsFaq() {
  return (
    <WebFaqSection
      title='Perguntas que você pode ter'
      subtitle='Qualquer coisa que não foi respondida aqui, manda pra vagas@nexopm.com, e alguém do nosso time responde.'
      items={WORK_TRIALS_FAQ_ITEMS}
    />
  )
}
