import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  type Billing,
  formatCurrency,
  formatPlanName,
} from '../(web)/_components/pricing/plans'
import type { UpgradeCheckout } from './use-upgrade-checkout'

interface UpgradeOrderSummaryCardProps {
  checkout: UpgradeCheckout
}

export function UpgradeOrderSummaryCard({
  checkout,
}: UpgradeOrderSummaryCardProps) {
  const {
    plan,
    price,
    seats,
    billing,
    setBilling,
    discount,
    savings,
    maxDiscount,
    couponInput,
    setCouponInput,
    appliedCoupon,
    couponError,
    setCouponError,
    couponPending,
    couponDiscount,
    finalTotal,
    applyCoupon,
    removeCoupon,
    error,
    isPending,
    workspaceId,
    handleCheckout,
  } = checkout

  return (
    <div className='bg-muted h-full w-full rounded-lg flex flex-col justify-between gap-4 p-5'>
      {plan && price ? (
        <>
          <div className='flex flex-col text-sm gap-4'>
            <Muted className='font-semibold text-xs'>Resumo do pedido</Muted>
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
                      {seats} usuários × {formatCurrency(price.monthly)} × 1 mês
                    </Muted>
                    <span>{formatCurrency(price.monthly * seats)}</span>
                  </TabsContent>

                  <TabsContent
                    value='yearly'
                    className='flex flex-col gap-2 items-start justify-between text-base'
                  >
                    <div className='flex items-center justify-between w-full'>
                      <Muted className='text-base'>
                        {seats} usuários × {formatCurrency(price.monthly)} × 12
                        meses
                      </Muted>
                      <span>{formatCurrency(price.monthly * 12 * seats)}</span>
                    </div>
                    <div className='text-green-700 dark:text-green-200 flex items-center justify-between w-full'>
                      Desconto anual (economizado {Math.round(discount * 100)}
                      %)
                      <span>-{formatCurrency(savings)}</span>
                    </div>
                  </TabsContent>
                </div>
              )}
            </Tabs>
          </div>
          <div className='w-full h-px bg-border/80' />
          <div className='flex flex-col gap-3'>
            <div className='gap-2 text-sm font-medium flex w-fit items-center leading-snug'>
              Cupom de desconto
            </div>
            {appliedCoupon ? (
              <div className='flex items-center justify-between bg-card rounded-lg pl-3 pr-1.5 py-1.5 text-sm'>
                <span className='font-medium'>{appliedCoupon.code}</span>
                <Button
                  variant='ghost'
                  size='xs'
                  className='hover:bg-transparent! text-muted-foreground'
                  onClick={removeCoupon}
                >
                  Remover
                </Button>
              </div>
            ) : (
              <div className='flex items-center gap-2'>
                <Input
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value)
                    setCouponError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      applyCoupon()
                    }
                  }}
                  placeholder='Insira o código'
                  className='h-9 border border-border uppercase placeholder:normal-case'
                />
                <Button
                  variant='outline'
                  size='sm'
                  onClick={applyCoupon}
                  disabled={couponPending}
                >
                  {couponPending ? 'Validando...' : 'Aplicar'}
                </Button>
              </div>
            )}
            {couponError && (
              <p className='text-sm text-destructive'>{couponError}</p>
            )}
          </div>
          {couponDiscount > 0 && (
            <div className='flex justify-between text-sm text-green-700 dark:text-green-200'>
              <span>Cupom {appliedCoupon?.code}</span>
              <span>-{formatCurrency(couponDiscount)}</span>
            </div>
          )}
          <div className='flex justify-between'>
            <span className='font-medium'>Valor total a pagar</span>
            <span className='font-medium'>
              {formatCurrency(finalTotal)}
              {billing === 'yearly' ? '/ano' : '/mês'}
            </span>
          </div>
        </>
      ) : (
        <Muted className='text-sm'>Selecione um plano para ver o total.</Muted>
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
  )
}
