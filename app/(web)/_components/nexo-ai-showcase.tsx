'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Muted } from '@/components/typography/text/muted'
import { Progress } from '@/components/ui/progress'

const ROTATE_INTERVAL_MS = 20000
const TICK_MS = 100
const PROGRESS_STEP = (100 * TICK_MS) / ROTATE_INTERVAL_MS

const items = [
  {
    title: 'Respostas que enxergam todo o seu workspace',
    description:
      'Pergunte qualquer coisa pra Nexo AI: status de um ciclo, o que travou um projeto, o que mudou numa doc semana passada. Ela lê o seu workspace inteiro, sem você colar contexto.',
    image: '/home/bg-home.png',
  },
  {
    title: 'Agentes que cuidam do trabalho repetitivo',
    description:
      'Agentes embarcados triam pedidos que chegam, atribuem responsáveis, sinalizam bloqueios e mandam atualizações automaticamente.',
    image: '/home/bg-home.png',
  },
  {
    title: 'Onde o seu time já conversa',
    description:
      'Leve a Nexo AI pro Slack: transforme uma mensagem perdida no canal em issue rastreável, sem abrir outra aba pra criar a tarefa.',
    image: '/home/bg-home.png',
  },
]

export function NexoAiShowcase() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + PROGRESS_STEP
        if (next < 100) return next
        setActiveIndex((current) => (current + 1) % items.length)
        return 0
      })
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [])

  function handleSelect(index: number) {
    setActiveIndex(index)
    setProgress(0)
  }

  return (
    <div className='space-y-12'>
      <Image
        src={items[activeIndex].image}
        alt='Visão geral do Nexo AI'
        width={5024}
        height={2752}
        sizes='100vw'
        className='w-full h-auto object-cover object-center rounded-4xl'
      />
      <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
        {items.map((item, index) => (
          <button
            key={item.title}
            type='button'
            onClick={() => handleSelect(index)}
            className='flex flex-col items-start space-y-3 text-left cursor-pointer'
          >
            <Progress value={index === activeIndex ? progress : 0} />
            <span className='font-medium text-lg md:whitespace-pre-line'>
              {item.title}
            </span>
            <Muted className='text-sm font-normal'>{item.description}</Muted>
          </button>
        ))}
      </div>
    </div>
  )
}
