'use client'

import { useState } from 'react'
import { Muted } from '@/components/typography/text/muted'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { formatCurrency, getPrice } from './plans'

const MAX_SEATS = 5000

interface Tool {
  id: string
  name: string
  /** Custo anual por assento, em centavos de BRL. */
  annualPerSeat: number
  logo: string
  invertOnDark?: boolean
}

const PROJECT_MANAGEMENT_SOFTWARE: Tool[] = [
  {
    id: 'jira',
    name: 'Jira',
    annualPerSeat: 68058,
    logo: '/software-logo/jira.svg',
  },
  {
    id: 'linear',
    name: 'Linear',
    annualPerSeat: 137664,
    logo: '/software-logo/linear.svg',
  },
  {
    id: 'clickup',
    name: 'ClickUp',
    annualPerSeat: 103248,
    logo: '/software-logo/click-up.svg',
  },
  {
    id: 'asana',
    name: 'Asana',
    annualPerSeat: 215014,
    logo: '/software-logo/asana.svg',
  },
  {
    id: 'monday',
    name: 'Monday',
    annualPerSeat: 163476,
    logo: '/software-logo/monday.svg',
  },
  {
    id: 'github',
    name: 'GitHub Projects',
    annualPerSeat: 34416,
    logo: '/software-logo/github-light.svg',
    invertOnDark: true,
  },
  {
    id: 'trello',
    name: 'Trello',
    annualPerSeat: 86040,
    logo: '/software-logo/trello.svg',
  },
  {
    id: 'wrike',
    name: 'Wrike',
    annualPerSeat: 215100,
    logo: '/software-logo/wrike.svg',
  },
]

const KNOWLEDGE_MANAGEMENT_SOFTWARE: Tool[] = [
  {
    id: 'confluence',
    name: 'Confluence',
    annualPerSeat: 52341,
    logo: '/software-logo/confluence.svg',
  },
  {
    id: 'notion',
    name: 'Notion',
    annualPerSeat: 172080,
    logo: '/software-logo/notion-light.svg',
    invertOnDark: true,
  },
  {
    id: 'coda',
    name: 'Coda',
    annualPerSeat: 86040,
    logo: '/software-logo/coda.svg',
  },
  {
    id: 'outline',
    name: 'Outline',
    annualPerSeat: 34416,
    logo: '/software-logo/outline-light.svg',
    invertOnDark: true,
  },
  {
    id: 'word',
    name: 'Word',
    annualPerSeat: 107550,
    logo: '/software-logo/word.svg',
  },
  {
    id: 'gdocs',
    name: 'Google Docs',
    annualPerSeat: 120456,
    logo: '/software-logo/google-docs.svg',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    annualPerSeat: 35850,
    logo: '/software-logo/obsidian.svg',
  },
]

function clampSeats(value: number) {
  return Math.min(Math.max(value, 0), MAX_SEATS)
}

export function PricingCalculator() {
  // Nexo PRO anual por assento, em centavos (BRL).
  const nexoAnnualPerSeat = getPrice('PRO')?.yearly ?? 0

  const [seats, setSeats] = useState(10)
  const [pmId, setPmId] = useState(PROJECT_MANAGEMENT_SOFTWARE[0].id)
  const [kmId, setKmId] = useState(KNOWLEDGE_MANAGEMENT_SOFTWARE[0].id)

  const pm =
    PROJECT_MANAGEMENT_SOFTWARE.find((t) => t.id === pmId) ??
    PROJECT_MANAGEMENT_SOFTWARE[0]
  const km =
    KNOWLEDGE_MANAGEMENT_SOFTWARE.find((t) => t.id === kmId) ??
    KNOWLEDGE_MANAGEMENT_SOFTWARE[0]

  const perSeat = pm.annualPerSeat + km.annualPerSeat
  const current = perSeat * seats
  const nexo = nexoAnnualPerSeat * seats
  const savings = Math.max(current - nexo, 0)

  return (
    <div
      className='w-full grid lg:grid-cols-3 border border-border scroll-mt-20'
      id='calculator'
    >
      <div className='w-full flex flex-col lg:col-span-2'>
        <div className='w-full flex flex-col gap-8 p-8 pb-4'>
          <div className='flex flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <Label className='text-base'>Número de membros</Label>
              <Input
                min={0}
                max={MAX_SEATS}
                value={seats}
                onChange={(e) => setSeats(clampSeats(Number(e.target.value)))}
                className='bg-muted w-14 flex items-center justify-center rounded-md p-2 text-center'
              />
            </div>
            <Slider
              min={10}
              max={MAX_SEATS}
              value={[seats]}
              onValueChange={(value) =>
                setSeats(clampSeats(Array.isArray(value) ? value[0] : value))
              }
              className='w-full'
            />
          </div>
          <ToolSelect
            label='Software de gerenciamento de projetos'
            name='pm'
            tools={PROJECT_MANAGEMENT_SOFTWARE}
            value={pmId}
            onValueChange={setPmId}
          />
          <ToolSelect
            label='Software de gestão de conhecimento'
            name='km'
            tools={KNOWLEDGE_MANAGEMENT_SOFTWARE}
            value={kmId}
            onValueChange={setKmId}
          />
        </div>
        <div className='w-full grid flex-col gap-8 p-8 pt-4 border-t border-border'>
          <div className='w-full grid lg:grid-cols-2 gap-8'>
            <div className='flex flex-col gap-2'>
              <Muted>Plano</Muted>
              <div className='w-fit px-4 py-2 text-sm border border-branding-400 rounded-md'>
                Pro
              </div>
            </div>
            <div className='flex flex-col gap-2'>
              <Muted>Valor</Muted>
              <div className='bg-card p-3 rounded-md text-sm'>
                {formatCurrency(nexoAnnualPerSeat / 12)} por usuário/mês
              </div>
            </div>
          </div>
          <div className='w-full grid lg:grid-cols-2 gap-8'>
            <div className='flex flex-col gap-2'>
              <Muted>
                Custo anual com {pm.name} para {seats}{' '}
                {seats === 1 ? 'usuário' : 'usuários'}.
              </Muted>
              <div className='bg-card p-3 rounded-md text-sm'>
                {formatCurrency(pm.annualPerSeat * seats)} por ano
              </div>
            </div>
            <div className='flex flex-col gap-2'>
              <Muted>
                Custo anual com {km.name} para {seats}{' '}
                {seats === 1 ? 'usuário' : 'usuários'}.
              </Muted>
              <div className='bg-card p-3 rounded-md text-sm'>
                {formatCurrency(km.annualPerSeat * seats)} por ano
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-8 p-8 lg:col-span-1 border-l border-border'>
        <h4>Nós fizemos as contas para você.</h4>
        <div className='flex flex-1 flex-col justify-evenly gap-8'>
          <ResultCard
            title='Custo atual das ferramentas escolhidas'
            value={formatCurrency(current)}
          />
          <ResultCard title='Custo com o Nexo' value={formatCurrency(nexo)} />
          <ResultCard
            title='Economia com o Nexo'
            value={formatCurrency(savings)}
          />
        </div>
      </div>
    </div>
  )
}

function ToolSelect({
  label,
  name,
  tools,
  value,
  onValueChange,
}: {
  label: string
  name: string
  tools: Tool[]
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <fieldset className='flex flex-col gap-2'>
      <Label className='mb-1 text-muted-foreground text-base'>{label}</Label>
      <div className='flex item-center gap-2'>
        {tools.map((tool) => (
          <label
            key={tool.id}
            className={cn(
              'h-14 w-15 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-border p-4 text-center transition-colors',
              'hover:bg-muted',
              'has-checked:border-branding-400 has-checked:bg-branding-400/5 has-checked:text-branding',
              'has-focus-visible:ring-2 has-focus-visible:ring-ring',
            )}
          >
            <input
              type='radio'
              name={name}
              value={tool.id}
              checked={value === tool.id}
              onChange={() => onValueChange(tool.id)}
              className='sr-only'
            />
            <img
              src={tool.logo}
              alt={tool.name}
              className={cn(
                'size-10 object-contain',
                tool.invertOnDark && 'dark:invert',
              )}
            />
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function ResultCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className='h-full flex flex-col items-center justify-center gap-2 rounded-xl px-4 py-6'>
      <CardDescription className='text-base font-normal'>
        {title}
      </CardDescription>
      <CardTitle className='text-2xl font-normal'>{value}</CardTitle>
    </Card>
  )
}
