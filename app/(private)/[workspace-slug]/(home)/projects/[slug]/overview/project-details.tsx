import {
  PanelLeftIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const PANEL_ID = 'project-details'

export function ProjectDetailsToggle({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
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
            aria-controls={PANEL_ID}
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

export function ProjectDetails({ open }: { open: boolean }) {
  return (
    <aside
      id={PANEL_ID}
      aria-label='Detalhes do projeto'
      hidden={!open}
      className='w-80 h-full shrink-0 overflow-y-auto no-scrollbar border-l border-secondary'
    >
      <div className='p-6'>
        <Tabs defaultValue='properties'>
          <TabsList variant='line' className='w-full'>
            <Tooltip>
              <TooltipTrigger
                render={
                  <TabsTrigger value='properties' aria-label='Propriedades'>
                    <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
                  </TabsTrigger>
                }
              />
              <TooltipContent side='top'>Propriedades</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <TabsTrigger value='updates' aria-label='Atualizações'>
                    <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
                  </TabsTrigger>
                }
              />
              <TooltipContent side='top'>Atualizações</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <TabsTrigger value='activity' aria-label='Atividade'>
                    <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
                  </TabsTrigger>
                }
              />
              <TooltipContent side='top'>Atividade</TooltipContent>
            </Tooltip>
          </TabsList>

          <TabsContent value='properties'>
            <h2>Propriedades</h2>
            <form>
              <div>
                <div>
                  <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
                  <p>Estado</p>
                </div>
                {/* project-state dropdown */}
              </div>
              <div>
                <div>
                  <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
                  <p>Prioridade</p>
                </div>
                {/* project-priority dropdown */}
              </div>
              <div>
                <div>
                  <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
                  <p>Líder</p>
                </div>
                {/* project-lead dropdown */}
              </div>
              <div>
                <div>
                  <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
                  <p>Prioridade</p>
                </div>
                <div>1 membro(s)</div>
              </div>
              <div>
                <div>
                  <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
                  <p>Etiquetas</p>
                </div>
                {/* project-labels dropdown */}
              </div>
              <div>
                <div>
                  <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
                  <p>Data de início</p>
                </div>
                {/* project-start-date dropdown */}
              </div>
              <div>
                <div>
                  <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
                  <p>Data de conclusão</p>
                </div>
                {/* project-dute-date dropdown */}
              </div>
            </form>
          </TabsContent>
          <TabsContent value='updates'>…</TabsContent>
          <TabsContent value='activity'>…</TabsContent>
        </Tabs>
      </div>
    </aside>
  )
}
