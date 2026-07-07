import {
  DatabaseIcon,
  ServerStack01Icon,
  Shield01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { CardCertifications } from '../_components/card-certifications'
import { Faq } from '../_components/faq'
import { BillingToggle } from '../_components/pricing/pricing-billing-toggle'
import { PricingCalculator } from '../_components/pricing/pricing-calculator'
import { PricingCardPlan } from '../_components/pricing/pricing-card-plan'
import { PricingTableDetailsPlan } from '../_components/pricing/table/pricing-table-details-plan'
import { SubTitle } from '../_components/text/sub-title'
import { Title } from '../_components/text/title'

export default function PricingPage() {
  return (
    <main className='mx-auto w-full flex flex-col items-center px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384'>
      <div className='border-border lg:border-x mx-auto w-full flex flex-col items-center gap-4 py-20'>
        <Title>
          Comece grátis, <br />
          evolua no seu ritmo
        </Title>
        <SubTitle>
          Do essencial ao avançado, nossos planos crescem com a sua empresa -
          com recursos que simplificam a gestão de projetos e aumenta a
          produtividade.{' '}
          <Link
            href='#features'
            className='text-branding-600 dark:text-branding-400'
          >
            Compare e veja por si mesmo.
          </Link>
        </SubTitle>
      </div>
      <div className='w-full flex justify-start gap-4 border-border items-center border px-5 py-6'>
        <BillingToggle />
      </div>
      <div className='border-x border-border grid w-full grid-cols-1 lg:grid-cols-2 xl:grid-cols-4'>
        <PricingCardPlan plan='FREE' />
        <PricingCardPlan plan='PRO' />
        <PricingCardPlan plan='BUSINESS' />
        <PricingCardPlan plan='ENTERPRISE' />
      </div>
      <div className='grid grid-cols-3 border border-border gap-4 px-5 py-8'>
        <div className='flex gap-2'>
          <NexoIcon icon={ServerStack01Icon} size={24} strokeWidth={2} />
          <div className='flex flex-col gap-1.5'>
            <h5 className='flex gap-2 text-base font-semibold'>
              Execute o Nexo em sua infraestrutura
            </h5>
            <div className='text-sm'>
              Implante o Nexo em seus próprios servidores com controle e
              flexibilidade completos.
            </div>
          </div>
        </div>
        <div className='flex gap-2'>
          <NexoIcon icon={DatabaseIcon} size={24} strokeWidth={2} />
          <div className='flex flex-col gap-1.5'>
            <h5 className='flex gap-2 text-base font-semibold'>
              Propriedade completa de dados
            </h5>
            <div className='text-sm'>
              Seus dados ficam com você: exportação completa, retenção
              configurável e conformidade com a LGPD.
            </div>
          </div>
        </div>
        <div className='flex gap-2'>
          <NexoIcon icon={Shield01Icon} size={24} strokeWidth={2} />
          <div className='flex flex-col gap-1.5'>
            <h5 className='flex gap-2 text-base font-semibold'>
              Construído para conformidade e infra personalizada
            </h5>
            <div className='text-sm'>
              Criptografia, auditoria de acessos e verificação em duas etapas
              para proteger o seu workspace.
            </div>
          </div>
        </div>
      </div>
      <div className='flex items-center justify-center gap-4 py-4 border border-border w-full'>
        <Link href='#features'>
          <Button size='sm'>Lista completa de recursos</Button>
        </Link>
        <Link href='#calculator'>
          <Button size='sm' variant='outline'>
            Calculadora de poupança
          </Button>
        </Link>
      </div>
      <div className='w-full border border-border flex flex-col gap-4 px-4 pt-20 pb-4'>
        <h4 className='font-normal text-3xl'>
          Reduza seus custos em mais de 70%
        </h4>
        <p>
          Escolha uma ferramenta de cada categoria abaixo e compararemos
          automaticamente os planos equivalentes.
        </p>
      </div>
      <PricingCalculator />
      <div className='w-full border border-border flex flex-col gap-4 px-4 pt-20 pb-4'>
        <h4 className='font-normal text-3xl'>
          Recursos que desbloqueiam apenas quando você precisa deles
        </h4>
      </div>
      <PricingTableDetailsPlan />
      <CardCertifications />
      <Faq />
    </main>
  )
}
