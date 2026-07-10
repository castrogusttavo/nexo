import {
  BILLING_INTERVALS,
  type BillingInterval,
  PLAN_PRICES,
  type PlanPrice,
} from '@/src/config/plan-prices'
import { PlanSchema, type PlanTier } from '@/src/schemas/plan.schema'

/** Tier de plano — reusa o enum do backend (`src/schemas/plan.schema`). */
export type PlanGrid = PlanTier
export const PLAN_ORDER = PlanSchema.options

export type { PlanPrice } from '@/src/config/plan-prices'
export { PAID_PLAN_PRICES } from '@/src/config/plan-prices'

/** Cadência de cobrança — `monthly`/`yearly` (padrão do backend), via url-state `?billing=`. */
export type Billing = BillingInterval
export const BILLINGS = BILLING_INTERVALS

export interface PlanFeature {
  title: string
  description: string
}

export interface PlanCopy {
  description: string
  features: PlanFeature[]
}

export const PLANS: Record<PlanGrid, PlanCopy> = {
  FREE: {
    description:
      'Gerenciamento de projetos sem complicação para startups, projetos pessoais e muito mais.',
    features: [
      {
        title: '500 créditos de IA por usuário',
        description:
          'Compartilhado em todo o seu espaço de trabalho. Sem rollover. Visualizar resultados/histórico é gratuito.',
      },
      {
        title: 'Projetos e itens de trabalho',
        description:
          'Entregue projetos rapidamente com itens de trabalho ricos em recursos e fáceis de usar.',
      },
      {
        title: 'Ciclos e módulos',
        description:
          'Defina timeboxes para o trabalho e divida-o em blocos repetíveis com poucos cliques.',
      },
      {
        title: 'Layouts e visualizações',
        description:
          'Cinco layouts, visualizações ilimitadas e flexibilidade para todos.',
      },
      {
        title: 'Estimativas',
        description: 'Tire a adivinhação do esforço e dos prazos.',
      },
      {
        title: 'Páginas de projeto',
        description:
          'Documente tudo sobre o seu trabalho sem trocar de interface.',
      },
      {
        title: 'Até 12 usuários',
        description: 'Convide até 12 membros para colaborar no workspace.',
      },
    ],
  },
  PRO: {
    description:
      'Para equipes em crescimento que precisam de mais recursos e controle.',
    features: [
      {
        title: '1.000 créditos de IA por usuário',
        description:
          'Créditos são emitidos mensalmente por assento. Recargas disponíveis.',
      },
      {
        title: 'Entrada de itens de trabalho',
        description:
          'Capture todas as entradas e escolha quais transformar em itens de trabalho.',
      },
      {
        title: 'Tipos de itens e propriedades personalizadas',
        description:
          'Personalize como sua equipe trabalha com aparências e propriedades exclusivas.',
      },
      {
        title: 'Wiki do workspace',
        description:
          'Conhecimento por tópico e por equipe para toda a empresa.',
      },
      {
        title: 'Controle de tempo e registros de trabalho',
        description:
          'Acompanhe o tempo por item de trabalho, baixe relatórios e edite como preferir.',
      },
      {
        title: 'Modelos de itens e páginas',
        description:
          'Replique seus itens de trabalho padrão sem dor de cabeça.',
      },
      {
        title: 'Dashboards',
        description:
          'Visualize seus dados de trabalho, com zoom rápido para dentro e para fora.',
      },
      {
        title: 'Iniciativas',
        description: 'Codifique sua missão e seus objetivos com facilidade.',
      },
      {
        title: 'Espaços de equipe (Teamspaces)',
        description:
          'Um espaço sem ruído e personalizável para suas equipes colaborarem.',
      },
      {
        title: 'Integrações + Marketplace',
        description: 'Conecte sua pilha de ferramentas existente.',
      },
      {
        title: 'Convidados (1 para cada 5 usuários)',
        description:
          'Convide colaboradores externos na proporção de 1 para cada 5 usuários.',
      },
    ],
  },
  BUSINESS: {
    description:
      'Ideal para gerentes de projeto, equipes maiores e maior controle do fluxo de trabalho.',
    features: [
      {
        title: '2.000 créditos de IA por usuário',
        description:
          'Os créditos são emitidos mensalmente por assento, com limites de administração e relatórios de uso.',
      },
      {
        title: 'Modelos de projeto',
        description:
          'Dimensione fluxos de trabalho comprovados entre as equipes.',
      },
      {
        title: 'Itens de trabalho recorrentes',
        description:
          'Automatize o trabalho cíclico para que sua equipe nunca esqueça, duplique ou gere errado.',
      },
      {
        title: 'Solicitações por e-mail e formulários',
        description:
          'Transforme e-mails externos e envios de formulários em itens de trabalho triageáveis.',
      },
      {
        title: 'Páginas aninhadas e incorporações',
        description:
          'Registre o conhecimento progressivamente e traga contexto rico de outras fontes.',
      },
      {
        title: 'Fluxo de trabalho único',
        description:
          'Controle como os itens de trabalho se movem entre estados dentro de cada projeto.',
      },
      {
        title: 'Clientes',
        description:
          'Perfis dedicados dos seus clientes, com as solicitações vinculadas a itens de trabalho.',
      },
      {
        title: 'Dashboards com widgets avançados',
        description:
          'Painéis com widgets avançados para análises mais profundas.',
      },
    ],
  },
  ENTERPRISE: {
    description:
      'Para organizações que exigem escala, governança e infraestrutura dedicada.',
    features: [
      {
        title: 'Créditos de IA flexíveis',
        description:
          'Alocações de crédito personalizadas, controles de uso e suporte prioritário.',
      },
      {
        title: 'Implantações privadas e gerenciadas',
        description:
          'Plano como serviço, personalizado e totalmente gerenciado.',
      },
      {
        title: 'Controle de acesso granular',
        description: 'Controle quem vê o quê e quando, no nível mais granular.',
      },
      {
        title: 'Múltiplos fluxos + aprovações',
        description:
          'Execute fluxos de trabalho por tipo de item, com aprovadores designados por transição.',
      },
      {
        title: 'Suporte a LDAP',
        description:
          'Autentique, autorize e sincronize grupos com seu diretório LDAP.',
      },
      {
        title: 'Logs de auditoria via API',
        description: 'Rastreie programaticamente quem fez o quê e quando.',
      },
      {
        title: 'Serviços de migração e implementação',
        description: 'Equipe dedicada para migração de dados e onboarding.',
      },
    ],
  },
}

/** Formata centavos (BRL) como moeda, escondendo os `,00` quando inteiro. */
export function formatCurrency(cents: number) {
  const value = cents / 100

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** `"FREE"` -> `"Free"`. */
export function formatPlanName(plan: PlanGrid) {
  return plan.charAt(0) + plan.slice(1).toLowerCase()
}

/** Plano anterior na hierarquia (`null` no FREE). */
export function previousPlan(plan: PlanGrid): PlanGrid | null {
  const index = PLAN_ORDER.indexOf(plan)
  return index > 0 ? PLAN_ORDER[index - 1] : null
}

/** URL de checkout/upgrade para um plano pago, com a cadência escolhida. */
export function upgradeUrl(plan: PlanGrid, billing: Billing) {
  return `/upgrade?plan=${plan}&billing=${billing}`
}

/** Preço do plano (BRL), ou `null` se não tiver preço público (Enterprise). */
export function getPrice(plan: PlanGrid): PlanPrice | null {
  return PLAN_PRICES[plan]
}

/** Preço por mês na cobrança anual, em centavos. */
export function yearlyPerMonth(price: PlanPrice) {
  return price.yearly / 12
}

/** Desconto do anual vs mensal (0..1); `0` para planos gratuitos. */
export function yearlyDiscount(price: PlanPrice) {
  if (price.monthly === 0) return 0
  return (price.monthly - yearlyPerMonth(price)) / price.monthly
}

/** Preço por mês (centavos) na cadência escolhida. */
export function priceForBilling(price: PlanPrice, billing: Billing) {
  return billing === 'yearly' ? yearlyPerMonth(price) : price.monthly
}
