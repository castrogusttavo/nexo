import { type WebFaqItem, WebFaqSection } from '../_components/web-faq-section'

const CAREERS_FAQ_ITEMS: WebFaqItem[] = [
  {
    question: 'Nada das vagas combina comigo. Ainda assim vale escrever?',
    answer:
      'Vale sim. Escreva contando o que você construiria aqui e por que isso importa pra você. Se preferir pular o texto, mostre alguma coisa que você já construiu — um projeto pessoal, uma contribuição, o que for. Isso conta mais do que uma carta de apresentação.',
  },
  {
    question: 'Uma IA vai decidir se eu entro?',
    answer:
      'Não. Contratação segue o mesmo princípio que usamos pra construir o produto: agentes cuidam do trabalho repetitivo, pessoas cuidam do julgamento. Agentes ajudam a agendar, transcrever e organizar. Uma pessoa lê cada candidatura, pessoas conduzem cada conversa, e quem trabalhou com você no work trial é quem decide.',
  },
  {
    question: 'O que é o work trial?',
    answer:
      'A última etapa do nosso processo: de dois a cinco dias remunerados de trabalho real com o time que você entraria, no seu ritmo, com o valor combinado por escrito antes de você aceitar — e você recebe independente do resultado. Ele avalia a gente tanto quanto avalia você.',
  },
  {
    question: 'Estou no começo da carreira pra essas vagas?',
    answer:
      'Contratamos por trajetória e evidência de construção, não por anos de experiência. Se você já entregou coisas, mostre essas coisas — projeto pessoal, contribuição em algum lugar, obsessão pessoal que virou algo real, tudo conta. Não existe exigência de senioridade pra mostrar o que você fez.',
  },
]

export function CareersFaq() {
  return (
    <WebFaqSection
      title='Perguntas que você pode ter'
      subtitle='Qualquer coisa que não foi respondida aqui, manda pra vagas@nexopm.com, e alguém do nosso time responde.'
      items={CAREERS_FAQ_ITEMS}
    />
  )
}
