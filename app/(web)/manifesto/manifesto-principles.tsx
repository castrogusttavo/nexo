'use client'

import {
  AnimatePresence,
  type MotionValue,
  motion,
  useScroll,
  useTransform,
} from 'motion/react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface PrincipleBlock {
  type: 'p' | 'quote'
  text: string
}

interface Principle {
  id: string
  number: string
  title: string
  blocks: PrincipleBlock[]
}

const PRINCIPLES: Principle[] = [
  {
    id: 'system-of-record',
    number: '01',
    title: 'Mantenha um único sistema de registro',
    blocks: [
      {
        type: 'p',
        text: 'A última geração de ferramentas de projeto otimizou pra rastrear itens, não pra preservar o retrato operacional. Então cada time construiu um sistema paralelo: doc num lugar, decisão em outro, atualização no chat, e a "verdade" numa planilha.',
      },
      { type: 'quote', text: 'Manter contexto deveria ser barato.' },
      {
        type: 'p',
        text: 'O Nexo trata execução e contexto como parte do mesmo workspace canônico.',
      },
      {
        type: 'p',
        text: 'O ponto não é consolidar por consolidar. É tirar o custo de fragmentação que obriga reunião de status só pra reconstruir o que está acontecendo.',
      },
    ],
  },
  {
    id: 'flexibly-opinionated',
    number: '02',
    title: 'Seja flexível, mas com opinião',
    blocks: [
      {
        type: 'p',
        text: 'Duas armadilhas se repetem nas ferramentas de trabalho. Uma dá liberdade total de configuração, e vira caos — cada time monta o próprio labirinto. A outra impõe uma metodologia única, e vira burocracia — todo mundo se adapta à ferramenta, não o contrário.',
      },
      {
        type: 'quote',
        text: 'O Nexo é opinativo sobre guardrails, não sobre doutrina.',
      },
      {
        type: 'p',
        text: 'Os elementos centrais continuam consistentes, então o trabalho permanece legível — mas cada time pode ajustar workflow, propriedades, estados e layout pro jeito que realmente trabalha. Estrutura deveria limitar ambiguidade, não limitar o time.',
      },
    ],
  },
  {
    id: 'legible-for-machines',
    number: '03',
    title: 'Seja legível pra máquinas também',
    blocks: [
      {
        type: 'p',
        text: 'Agentes de IA mudam a camada de interface do trabalho. Mas não mudam a necessidade de algo canônico por baixo. Se o seu sistema é um monte de fragmentos espalhados, um agente não consegue raciocinar sobre ele — só consegue completar em cima dos buracos.',
      },
      {
        type: 'quote',
        text: 'IA que realmente ajuda depende de um sistema estruturado e inteligível.',
      },
      {
        type: 'p',
        text: 'A peça que falta na maioria das empresas não é dado. É estrutura e histórico de decisão. Construímos o Nexo como um grafo de trabalho legível por máquina: elementos consistentes, vínculos explícitos, histórico durável, estado real — a base que torna a execução com IA possível sem virar chute.',
      },
      {
        type: 'quote',
        text: 'O futuro do trabalho é humano e IA juntos. A base precisa servir aos dois — e a Nexo AI está só começando essa parte.',
      },
    ],
  },
  {
    id: 'never-coerce-deployment',
    number: '04',
    title: 'Nunca use hospedagem como moeda de troca',
    blocks: [
      {
        type: 'p',
        text: 'Restrição de infraestrutura devia ser levada a sério como requisito de negócio, não como alavanca de venda. Produto que trava funcionalidade atrás de uma decisão de hospedagem está usando infraestrutura como moeda de troca — isso cria o incentivo errado: o time troca controle por recurso, e paga a dívida de segurança e conformidade anos depois.',
      },
      {
        type: 'quote',
        text: 'Pra muitas empresas, nuvem pública não é uma opção viável. Fronteira de confiança, política de residência de dados, escopo de auditoria e arquitetura de rede definem o que pode ser implantado — não o inverso.',
      },
      {
        type: 'p',
        text: 'Hoje o Nexo roda 100% na nuvem. Mas achamos esse princípio importante demais pra deixar de fora do manifesto: self-hosted e air-gapped estão no nosso roadmap, e quando chegarem, vão rodar a mesma plataforma — não uma versão capada esperando você pagar mais pra liberar o resto.',
      },
    ],
  },
  {
    id: 'scale-without-complexity',
    number: '05',
    title: 'Escale sem virar complexo',
    blocks: [
      {
        type: 'p',
        text: 'A maioria das ferramentas ganha escala adicionando superfície: conceito novo, papel novo, tela de administração nova. Em algum momento, a ferramenta vira uma função operacional própria — alguém precisa virar "especialista na ferramenta" só pra manter ela funcionando.',
      },
      { type: 'quote', text: 'Construímos pro time. Deixamos o time compor.' },
      {
        type: 'p',
        text: 'Escala devia nascer de composição, não de complexidade acumulada. Os mesmos elementos que funcionam pra um time de 8 pessoas continuam funcionando quando esse time vira 30, ou 80.',
      },
    ],
  },
  {
    id: 'operational-truth',
    number: '06',
    title: 'Mostre a verdade operacional em toda camada',
    blocks: [
      {
        type: 'p',
        text: 'A maioria das ferramentas de tracking de projeto opera de baixo pra cima. Pode até funcionar bem pro time que está na trincheira, mas raramente serve o contexto organizacional mais amplo.',
      },
      {
        type: 'quote',
        text: 'Visibilidade pra organização não devia ser um projeto paralelo — é função central do sistema.',
      },
      {
        type: 'p',
        text: 'Sem isso, ninguém tem uma visão de 30 mil pés confiável. O resultado: horas construindo relatório, curando dashboard e mantendo rollup que fica desatualizado assim que ninguém mais mexe nele. Essas representações acabam refletindo o esforço de quem construiu, não a verdade absoluta do que está acontecendo.',
      },
    ],
  },
]

const ACTIVE_ROOT_MARGIN = '-45% 0px -45% 0px'

export function ManifestoPrinciples() {
  const [activeId, setActiveId] = useState(PRINCIPLES[0].id)

  useEffect(() => {
    const sections = PRINCIPLES.map((principle) =>
      document.getElementById(principle.id),
    ).filter((el): el is HTMLElement => el !== null)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length === 0) return
        const topMost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
        )
        setActiveId(topMost.target.id)
      },
      { rootMargin: ACTIVE_ROOT_MARGIN, threshold: 0 },
    )

    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section className='mx-auto w-full px-4 sm:px-8 xl:px-11 xl:max-w-336 2xl:max-w-384 border-r border-l border-border py-16'>
      <div className='w-full px-5 py-16 md:px-9 grid gap-12 lg:grid-cols-[240px_1fr]'>
        <div className='space-y-6 lg:sticky lg:top-24 lg:self-start'>
          <div className='text-muted-foreground text-xs uppercase whitespace-nowrap font-medium font-mono tracking-[0.3em]'>
            princípios
          </div>
          <div className='space-y-4 border-l border-border pl-4'>
            {PRINCIPLES.map((principle) => (
              <a
                key={principle.id}
                href={`#${principle.id}`}
                className={cn(
                  'group relative flex items-center gap-3 text-sm text-muted-foreground transition-colors duration-300 ease-out before:absolute before:-left-[17px] before:top-0 before:h-full before:w-0.5 before:bg-brand-600 before:opacity-0 before:transition-opacity before:duration-300',
                  activeId === principle.id &&
                    'text-primary before:opacity-100',
                )}
              >
                <span className='w-6 font-mono text-xs font-semibold text-branding-600'>
                  {principle.number}
                </span>
                <span className='font-semibold'>{principle.title}</span>
              </a>
            ))}
          </div>
        </div>
        <div className='space-y-16'>
          {PRINCIPLES.map((principle) => (
            <PrincipleItem key={principle.id} principle={principle} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PrincipleItem({ principle }: { principle: Principle }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'start 0.3'],
  })

  return (
    <div id={principle.id} ref={ref} className='scroll-mt-24 space-y-8'>
      <div className='space-y-6'>
        <div className='flex flex-col gap-2'>
          <span className='text-h6 text-muted-foreground'>
            {principle.number}
          </span>
          <h2 className='font-normal text-5xl md:whitespace-pre-line'>
            {[...principle.title].map((char, index, chars) => (
              <PrincipleTitleChar
                key={index}
                char={char}
                index={index}
                total={chars.length}
                scrollYProgress={scrollYProgress}
              />
            ))}
          </h2>
        </div>
        <div className='space-y-6 text-muted-foreground font-medium'>
          {principle.blocks.map((block) =>
            block.type === 'quote' ? (
              <p
                key={block.text}
                className='border-l-2 border-branding-600 pl-6 italic text-primary'
              >
                {block.text}
              </p>
            ) : (
              <p key={block.text}>{block.text}</p>
            ),
          )}
        </div>
      </div>
    </div>
  )
}

interface PrincipleTitleCharProps {
  char: string
  index: number
  total: number
  scrollYProgress: MotionValue<number>
}

function PrincipleTitleChar({
  char,
  index,
  total,
  scrollYProgress,
}: PrincipleTitleCharProps) {
  const start = index / total
  const end = (index + 1) / total
  const charProgress = useTransform(
    scrollYProgress,
    [start, end],
    ['0%', '100%'],
  )

  return (
    <motion.span
      style={
        {
          '--title-progress': charProgress,
          color:
            'color-mix(in oklch, var(--muted-foreground), var(--primary) var(--title-progress))',
        } as React.CSSProperties
      }
    >
      {char}
    </motion.span>
  )
}
