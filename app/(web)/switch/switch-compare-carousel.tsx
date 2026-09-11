'use client'

import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import Image from 'next/image'
import Link from 'next/link'
import { useRef } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { SubTitle } from '../_components/text/sub-title'
import { Title } from '../_components/text/title'

interface CompareCard {
  slug: string
  title: string
  tagline: string
  image: string
}

const COMPARE_IMAGE = '/web/switch/vsjira-hover.jpg'

const COMPARE_CARDS: CompareCard[] = [
  {
    slug: 'jira',
    title: 'Nexo vs Jira',
    tagline: 'Molde seus workflows do seu jeito.',
    image: COMPARE_IMAGE,
  },
  {
    slug: 'linear',
    title: 'Nexo vs Linear',
    tagline: 'Junte times de engenharia e negócio.',
    image: COMPARE_IMAGE,
  },
  {
    slug: 'asana',
    title: 'Nexo vs Asana',
    tagline: 'Conecte o plano do projeto à entrega de engenharia.',
    image: COMPARE_IMAGE,
  },
  {
    slug: 'clickup',
    title: 'Nexo vs ClickUp',
    tagline: 'Comece simples. Adicione workflows conforme cresce.',
    image: COMPARE_IMAGE,
  },
  {
    slug: 'monday',
    title: 'Nexo vs Monday',
    tagline: 'Dê a cada time uma visão clara do trabalho compartilhado.',
    image: COMPARE_IMAGE,
  },
]

export function SwitchCompareCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scrollByDirection(direction: 1 | -1) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.5, behavior: 'smooth' })
  }

  return (
    <section className='w-full flex flex-col items-start gap-20 py-16 text-left sm:py-20 md:items-center md:text-center lg:py-28'>
      <div className='w-full xl:max-w-336 xl:px-11 2xl:max-w-384 mx-auto flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
        <div className='flex flex-col items-start gap-2 text-left'>
          <Title>Qual ferramenta você está deixando?</Title>
          <SubTitle>Veja o que seu time ganha trocando pro Nexo.</SubTitle>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='icon-lg'
            onClick={() => scrollByDirection(-1)}
          >
            <NexoIcon icon={ArrowLeft02Icon} strokeWidth={2} />
          </Button>
          <Button
            variant='outline'
            size='icon-lg'
            onClick={() => scrollByDirection(1)}
          >
            <NexoIcon icon={ArrowRight02Icon} strokeWidth={2} />
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className='scrollbar-hidden flex w-full snap-x snap-mandatory scroll-pl-4 gap-6 overflow-auto pl-4 pr-4 sm:scroll-pl-8 sm:pl-8 sm:pr-8 xl:scroll-pl-[calc((100vw-1256px)/2)] xl:pl-[calc((100vw-1256px)/2)] xl:pr-[calc((100vw-1256px)/2)] 2xl:scroll-pl-[calc((100vw-1448px)/2)] 2xl:pl-[calc((100vw-1448px)/2)] 2xl:pr-[calc((100vw-1448px)/2)]'
      >
        {COMPARE_CARDS.map((card) => (
          <Link
            key={card.slug}
            href={`/nexo-vs-${card.slug}`}
            className='group focus-visible:ring-brand-default flex shrink-0 snap-start flex-col gap-4 rounded-xl focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset'
          >
            <Image
              src={card.image}
              alt=''
              width={352}
              height={421}
              className='rounded-xl grayscale transition-[filter] duration-500 ease-out group-hover:grayscale-0'
            />
            <div className='text-left'>
              <h6 className='font-normal text-xl md:whitespace-pre-line'>
                {card.title}
              </h6>
              <Muted className='text-sm font-medium'>{card.tagline}</Muted>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
