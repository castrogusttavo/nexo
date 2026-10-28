import {
  PanelRightCloseIcon,
  PanelRightOpenIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import type { ReactNode } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type IconType = Parameters<typeof NexoIcon>[0]['icon']

export interface DetailsPanelTab {
  value: string
  /** Names the icon-only trigger (aria-label) and its tooltip. */
  label: string
  icon: IconType
  content: ReactNode
}

interface DetailsPanelToggleProps {
  /** The panel's id, so the button can point at it (aria-controls). */
  panelId: string
  open: boolean
  onToggle: () => void
}

export function DetailsPanelToggle({
  panelId,
  open,
  onToggle,
}: DetailsPanelToggleProps) {
  const label = open ? 'Fechar detalhes' : 'Abrir detalhes'

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={label}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
          >
            <NexoIcon
              icon={open ? PanelRightCloseIcon : PanelRightOpenIcon}
              strokeWidth={2}
            />
          </Button>
        }
      />
      <TooltipContent side='bottom'>{label}</TooltipContent>
    </Tooltip>
  )
}

interface DetailsPanelProps {
  /** Unique per page: DetailsPanelToggle points at it. */
  id: string
  /** Accessible name of the region, e.g. 'Detalhes do projeto'. */
  label: string
  open: boolean
  /** Icon tabs across the top; leave out and pass children for a plain panel. */
  tabs?: DetailsPanelTab[]
  /** Tab open on first render; the first tab when omitted. */
  defaultTab?: string
  children?: ReactNode
}

/**
 * The right-hand details shell shared by the workspace pages: the page owns
 * the open state and the content, this owns the frame, the toggle wiring and
 * the tab bar.
 */
export function DetailsPanel({
  id,
  label,
  open,
  tabs,
  defaultTab,
  children,
}: DetailsPanelProps) {
  return (
    <aside
      id={id}
      aria-label={label}
      hidden={!open}
      className='w-80 h-full shrink-0 overflow-y-auto no-scrollbar border-l border-secondary'
    >
      <div className='p-6'>
        {tabs && tabs.length > 0 ? (
          <Tabs defaultValue={defaultTab ?? tabs[0].value}>
            <TabsList variant='line' className='w-full'>
              {tabs.map((tab) => (
                <Tooltip key={tab.value}>
                  <TooltipTrigger
                    render={
                      <TabsTrigger value={tab.value} aria-label={tab.label}>
                        <NexoIcon icon={tab.icon} strokeWidth={2} />
                      </TabsTrigger>
                    }
                  />
                  <TooltipContent side='top'>{tab.label}</TooltipContent>
                </Tooltip>
              ))}
            </TabsList>
            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          children
        )}
      </div>
    </aside>
  )
}
