import type { IconSvgElement } from '@hugeicons/react'
import {
  Airplane01Icon,
  Book02Icon,
  Building03Icon,
  BulbIcon,
  ChartUpIcon,
  CircleArrowDown02Icon,
  Factory01Icon,
  KeyframesMultipleAddIcon,
  Megaphone01Icon,
  News01Icon,
  Orbit01Icon,
  PaintBrush02Icon,
  PresentationLineChart02Icon,
  RepeatIcon,
  Rocket01Icon,
  SecurityCheckIcon,
  ServerStack03Icon,
  Settings02Icon,
  SourceCodeIcon,
  SparklesIcon,
  Stethoscope02Icon,
  StickyNote03Icon,
  Store01Icon,
  Target01Icon,
  UserGroupIcon,
  UserStar01Icon,
  WorkflowSquare01Icon,
  WorkIcon,
} from '@hugeicons-pro/core-solid-rounded'

export interface NavItemData {
  title: string
  href: string
  description: string
  icon?: IconSvgElement
}

// Produto
export const products: NavItemData[] = [
  {
    title: 'Gerenciamento de Projetos',
    description: 'Planeje, acompanhe e entregue trabalho',
    href: '#',
    icon: WorkIcon,
  },
  {
    title: 'Wiki',
    description: 'Documentos vinculados ao seu trabalho',
    href: '#',
    icon: StickyNote03Icon,
  },
  {
    title: 'Nexo AI',
    description: 'Agentes de IA para o seu workspace',
    href: '#',
    icon: SparklesIcon,
  },
]

export const featureCapabilities: NavItemData[] = [
  {
    title: 'Intake',
    description: 'Triagem e roteamento de trabalho recebido',
    href: '#',
    icon: CircleArrowDown02Icon,
  },
  {
    title: 'Itens de Trabalho',
    description: 'Tarefas estruturadas com rastreabilidade',
    href: '#',
    icon: KeyframesMultipleAddIcon,
  },
  {
    title: 'Épicos e Iniciativas',
    description: 'Metas de grande escala, progresso consolidado',
    href: '#',
    icon: BulbIcon,
  },
  {
    title: 'Ciclos',
    description: 'Sprints com prazo definido e gráficos de burn-down',
    href: '#',
    icon: Orbit01Icon,
  },
  {
    title: 'Dashboards',
    description: 'Velocidade, carga de trabalho e gargalos',
    href: '#',
    icon: PresentationLineChart02Icon,
  },
  {
    title: 'Teamspaces',
    description: 'Espaços isolados, governança compartilhada',
    href: '#',
    icon: UserGroupIcon,
  },
  {
    title: 'Workflows e Aprovações',
    description: 'Fluxos de trabalho baseados em regras com aprovações',
    href: '#',
    icon: WorkflowSquare01Icon,
  },
]

// Soluções
export const useCases: NavItemData[] = [
  {
    title: 'Produto',
    description: 'Leve funcionalidades da ideia até o lançamento',
    href: '#',
    icon: Target01Icon,
  },
  {
    title: 'Operação',
    description: 'Coordene o trabalho entre todas as equipes',
    href: '#',
    icon: Settings02Icon,
  },
  {
    title: 'Marketing',
    description: 'Campanhas, lançamentos e conteúdo',
    href: '#',
    icon: Megaphone01Icon,
  },
  {
    title: 'Agile',
    description: 'Ciclos, backlog e gráficos de burn-down integrados',
    href: '#',
    icon: RepeatIcon,
  },
  {
    title: 'Design',
    description: 'Gerencie revisões, feedbacks e entregas',
    href: '#',
    icon: PaintBrush02Icon,
  },
]

export const industries: NavItemData[] = [
  {
    title: 'Aeroespacial',
    description: 'Controle de projetos de missão crítica',
    href: '#',
    icon: Airplane01Icon,
  },
  {
    title: 'Saúde',
    description: 'Coordenação em conformidade com a HIPAA',
    href: '#',
    icon: Stethoscope02Icon,
  },
  {
    title: 'Governo',
    description: 'Ambientes isolados e soberania total dos dados',
    href: '#',
    icon: Building03Icon,
  },
  {
    title: 'Varejo',
    description: 'Operações de loja e coordenação de fornecedores',
    href: '#',
    icon: Store01Icon,
  },
  {
    title: 'Manufatura',
    description: 'Fluxos regulamentados com trilhas de auditoria',
    href: '#',
    icon: Factory01Icon,
  },
]

export const scale: NavItemData[] = [
  {
    title: 'Startups',
    description: 'Comece rápido e evolua a estrutura conforme cresce',
    href: '#',
    icon: Rocket01Icon,
  },
  {
    title: 'Equipes em crescimento',
    description: 'Escale sem aumentar a complexidade',
    href: '#',
    icon: ChartUpIcon,
  },
  {
    title: 'Empresa',
    description: 'Controle total e infraestrutura privada',
    href: '#',
    icon: ServerStack03Icon,
  },
]

// Recursos
export const discover: NavItemData[] = [
  {
    title: 'Blog',
    description: 'Atualizações, insights e análises aprofundadas',
    href: '#',
    icon: News01Icon,
  },
  {
    title: 'Novidades',
    description: 'Histórico completo de mudanças e lançamentos',
    href: '#',
    icon: Megaphone01Icon,
  },
  {
    title: 'Comunidade',
    description: 'Participe das discussões no fórum',
    href: '#',
    icon: UserGroupIcon,
  },
  {
    title: 'Clientes',
    description: 'Histórias de equipes que usam o Nexo',
    href: '#',
    icon: UserStar01Icon,
  },
]

export const learn: NavItemData[] = [
  {
    title: 'Documentação',
    description: 'Guias e referências do produto',
    href: '#',
    icon: Book02Icon,
  },
  {
    title: 'Referência de API',
    description: 'API REST, webhooks e SDKs',
    href: '#',
    icon: SourceCodeIcon,
  },
  {
    title: 'Segurança',
    description: 'Conformidade, certificações e confiança',
    href: '#',
    icon: SecurityCheckIcon,
  },
]
