'use client'

import { ArrowRight02Icon } from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { useQueryState } from 'nuqs'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLogger } from '@/lib/axiom/client'
import {
  type Billing,
  formatCurrency,
  formatPlanName,
  PAID_PLAN_PRICES,
  priceForBilling,
  yearlyDiscount,
} from '../(web)/_components/pricing/plans'
import {
  billingParser,
  planParser,
} from '../(web)/_components/pricing/plans-params'

interface UpgradeWorkspace {
  id: string
  name: string
  activePlan: string
}

export function UpgradeForm({
  workspaces,
}: {
  workspaces: UpgradeWorkspace[]
}) {
  const log = useLogger()
  const [plan, setPlan] = useQueryState('plan', planParser)
  const [billing, setBilling] = useQueryState('billing', billingParser)
  const [workspaceId, setWorkspaceId] = useState<string | null>(
    workspaces[0]?.id ?? null,
  )

  const [seats, setSeats] = useState(1)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const price = plan ? PAID_PLAN_PRICES[plan] : null
  const total = price
    ? (billing === 'yearly' ? price.yearly : price.monthly) * seats
    : 0
  const discount = price ? yearlyDiscount(price) : 0
  const savings = price ? (price.monthly * 12 - price.yearly) * seats : 0
  const maxDiscount = Math.max(
    yearlyDiscount(PAID_PLAN_PRICES.PRO),
    yearlyDiscount(PAID_PLAN_PRICES.BUSINESS),
  )

  async function handleCheckout() {
    if (!plan || !workspaceId) return
    setError(null)
    setIsPending(true)

    try {
      const response = await fetch('/api/payment/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, workspaceId, seats, interval: billing }),
      })
      const result = await response.json()

      if (result.success && result.data?.paymentUrl) {
        window.location.href = result.data.paymentUrl
        return
      }
      setError(result.error?.message ?? 'Não foi possível iniciar o pagamento')
    } catch (err) {
      setError('Não foi possível iniciar o pagamento')
      log.error('upgrade.checkout_failed', {
        component: 'UpgradeForm',
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <main className='flex flex-col gap-6 mx-auto max-w-286 p-12'>
      <div className='w-full flex flex-col gap-1.5'>
        <h4 className='font-medium text-2xl'>Atualize seu workspace</h4>
        <Muted>
          Esta atualização aplica-se a um workspace da nuvem. Escolha um plano e
          quantidade de usuários.
        </Muted>
      </div>
      <div className='grid grid-cols-1 gap-6 items-start lg:grid-cols-[minmax(0,1fr)_400px]'>
        <div className='flex flex-col w-full gap-6'>
          <div className='bg-muted w-full p-5 rounded-lg flex flex-col gap-7'>
            <Field
              orientation='horizontal'
              className='justify-between space-x-3'
            >
              <div className='flex flex-col gap-1.5'>
                <FieldLabel htmlFor='workspace'>
                  Workspace <span className='text-destructive'>*</span>
                </FieldLabel>
                <FieldDescription>
                  As atualizações em nuvem se aplicam a um espaço de trabalho na
                  compra.
                </FieldDescription>
              </div>
              <Select
                items={workspaces.map((ws) => ({
                  value: ws.id,
                  label: ws.name,
                }))}
                value={workspaceId ?? undefined}
                onValueChange={setWorkspaceId}
              >
                <SelectTrigger id='workspace' className='w-full max-w-60 h-9'>
                  <SelectValue placeholder='Selecione um workspace' />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {workspaces.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field
              orientation='horizontal'
              className='justify-between space-x-3'
            >
              <div className='flex flex-col gap-1.5'>
                <FieldLabel htmlFor='seats'>Quantidade dos usuários</FieldLabel>
                <FieldDescription>
                  Os usuários são baseados na contagem de membros do seu espaço
                  de trabalho.
                </FieldDescription>
              </div>
              <Input
                id='seats'
                type='number'
                min={1}
                value={seats}
                onChange={(e) =>
                  setSeats(Math.max(1, Number(e.target.value) || 1))
                }
                className='w-14 border border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
              />
            </Field>
          </div>
          <div className='bg-muted w-full p-5 rounded-lg flex flex-col gap-7'>
            <FieldSet>
              <FieldLegend>
                Escolha seu plano <span className='text-destructive'>*</span>
              </FieldLegend>
              <RadioGroup
                className='w-full flex justify-between'
                value={plan ?? ''}
                onValueChange={(value) => setPlan(value as 'PRO' | 'BUSINESS')}
              >
                <FieldLabel htmlFor='subscription-pro'>
                  <Field className='h-full'>
                    <FieldContent className='h-full px-5 py-4 flex flex-col gap-6 justify-between'>
                      <div className='flex flex-col gap-1'>
                        <div className='flex items-center justify-between'>
                          <FieldTitle>Pro</FieldTitle>
                        </div>
                        <FieldDescription>
                          Para equipes de pequeno a médio porte
                        </FieldDescription>
                      </div>
                      <div className='flex items-center gap-1.5'>
                        <FieldTitle className='text-xl font-semibold'>
                          {formatCurrency(
                            priceForBilling(PAID_PLAN_PRICES.PRO, billing),
                          )}
                        </FieldTitle>
                        <Muted>usuário/mês</Muted>
                      </div>
                    </FieldContent>
                    <RadioGroupItem
                      value='PRO'
                      id='subscription-pro'
                      className='hidden'
                    />
                  </Field>
                </FieldLabel>

                <FieldLabel htmlFor='subscription-business'>
                  <Field className='h-full'>
                    <FieldContent className='h-full! px-5 py-4 flex flex-col gap-6 justify-between'>
                      <div className='flex flex-col gap-1'>
                        <div className='flex items-center justify-between'>
                          <FieldTitle>Business</FieldTitle>
                          <Badge className='bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'>
                            Popular
                          </Badge>
                        </div>
                        <FieldDescription>
                          Para organizações de escala
                        </FieldDescription>
                      </div>
                      <div className='flex items-center gap-1.5'>
                        <FieldTitle className='text-xl font-semibold'>
                          {formatCurrency(
                            priceForBilling(PAID_PLAN_PRICES.BUSINESS, billing),
                          )}
                        </FieldTitle>
                        <Muted>usuário/mês</Muted>
                      </div>
                    </FieldContent>
                    <RadioGroupItem
                      value='BUSINESS'
                      id='subscription-business'
                      className='hidden'
                    />
                  </Field>
                </FieldLabel>
              </RadioGroup>
            </FieldSet>
            <div className='bg-card rounded-lg px-5 py-3 flex items-center justify-between text-sm'>
              <h5>Quer a experiência completa do Nexo Cloud empresarial?</h5>
              <Link href='/talk-to-sales'>
                <Button variant='link' size='sm' className='text-sky-400'>
                  Fale com vendas{' '}
                  <NexoIcon icon={ArrowRight02Icon} strokeWidth={2} />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className='bg-muted h-full w-full rounded-lg flex flex-col justify-between gap-4 p-5'>
          {plan && price ? (
            <>
              <div className='flex flex-col text-sm gap-4'>
                <Muted className='font-semibold text-xs'>
                  Resumo do pedido
                </Muted>
                <div className='space-y-1.5'>
                  <div className='gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50 flex w-fit items-center leading-snug'>
                    Plano {formatPlanName(plan)}
                  </div>
                  <Muted>
                    {seats === 1 ? '1 usuário' : `${seats} usuários`} • Nuvem
                  </Muted>
                </div>
              </div>
              <div className='w-full h-px bg-border/80' />
              <div className='flex-1 w-full flex flex-col gap-5'>
                <div className='gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50 flex w-fit items-center leading-snug'>
                  Frequência de faturamento
                </div>
                <Tabs
                  value={billing}
                  onValueChange={(v) => setBilling(v as Billing)}
                  className='w-full gap-5'
                >
                  <TabsList className='w-full bg-card'>
                    <TabsTrigger value='monthly'>Mensal</TabsTrigger>
                    <TabsTrigger value='yearly'>
                      Anual (economize até {Math.round(maxDiscount * 100)}%)
                    </TabsTrigger>
                  </TabsList>

                  {price && (
                    <div className='flex flex-col gap-4'>
                      <TabsContent
                        value='monthly'
                        className='flex items-center justify-between text-base'
                      >
                        <Muted className='text-base'>
                          {seats} usuários × {formatCurrency(price.monthly)} × 1
                          mês
                        </Muted>
                        <span>{formatCurrency(price.monthly * seats)}</span>
                      </TabsContent>

                      <TabsContent
                        value='yearly'
                        className='flex flex-col gap-2 items-start justify-between text-base'
                      >
                        <div className='flex items-center justify-between w-full'>
                          <Muted className='text-base'>
                            {seats} usuários × {formatCurrency(price.monthly)} ×
                            12 meses
                          </Muted>
                          <span>
                            {formatCurrency(price.monthly * 12 * seats)}
                          </span>
                        </div>
                        <div className='text-green-700 dark:text-green-200 flex items-center justify-between w-full'>
                          Desconto anual (economizado{' '}
                          {Math.round(discount * 100)}%)
                          <span>-{formatCurrency(savings)}</span>
                        </div>
                      </TabsContent>
                    </div>
                  )}
                </Tabs>
              </div>
              <div className='w-full h-px bg-border/80' />
              <div className='flex justify-between'>
                <span className='font-medium'>Valor total a pagar</span>
                <span className='font-medium'>
                  {formatCurrency(total)}
                  {billing === 'yearly' ? '/ano' : '/mês'}
                </span>
              </div>
            </>
          ) : (
            <Muted className='text-sm'>
              Selecione um plano para ver o total.
            </Muted>
          )}
          {error && <p className='text-sm text-destructive'>{error}</p>}
          <Button
            className='w-full'
            disabled={!plan || !workspaceId || isPending}
            onClick={handleCheckout}
          >
            {isPending ? 'Processando...' : 'Prossiga para o pagamento'}
          </Button>
        </div>
      </div>
    </main>
  )
}
