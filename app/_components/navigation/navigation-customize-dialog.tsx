'use client'

import {
  DragDropVerticalIcon,
  SlidersHorizontalIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable'
import {
  useSidebarNavigation,
  useUpdateUserPreferences,
} from '@/src/hooks/use-user-preferences'
import {
  DEFAULT_PROJECTS_LIMIT,
  PROJECTS_LIMIT_MAX,
  type SidebarNavigation,
} from '@/src/schemas/user-preference.schema'
import { AboutTooltip } from '../about-tooltip'
import {
  PERSONAL_NAV_ITEMS,
  type SidebarNavItemMeta,
  WORKSPACE_NAV_ITEMS,
} from './sidebar-navigation-items'

type NavEntry<T extends string> = { id: T; visible: boolean }

function SortableNavigationSection<T extends string>({
  title,
  about,
  items,
  meta,
  onItemsChange,
}: {
  title: string
  about: string
  items: NavEntry<T>[]
  meta: Record<T, SidebarNavItemMeta>
  onItemsChange: (items: NavEntry<T>[]) => void
}) {
  function toggle(id: T, visible: boolean) {
    onItemsChange(
      items.map((item) => (item.id === id ? { ...item, visible } : item)),
    )
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-1.5'>
        <span className='font-semibold'>{title}</span>
        <AboutTooltip text={about} />
      </div>
      <Sortable
        value={items}
        onValueChange={onItemsChange}
        getItemValue={(item) => item.id}
        strategy='vertical'
        className='bg-card flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2'
      >
        {items.map((item) => {
          const { label } = meta[item.id]
          return (
            <SortableItem key={item.id} value={item.id}>
              <div className='flex items-center gap-2 px-2 py-1'>
                <SortableItemHandle
                  aria-label={`Reordenar ${label}`}
                  className='cursor-grab text-muted-foreground hover:text-foreground'
                >
                  <NexoIcon icon={DragDropVerticalIcon} strokeWidth={2} />
                </SortableItemHandle>
                <Field orientation='horizontal' className='gap-2'>
                  <Checkbox
                    id={`nav-${item.id}`}
                    checked={item.visible}
                    onCheckedChange={(checked) => toggle(item.id, checked)}
                  />
                  <FieldLabel htmlFor={`nav-${item.id}`}>{label}</FieldLabel>
                </Field>
              </div>
            </SortableItem>
          )
        })}
      </Sortable>
    </div>
  )
}

// Saved on blur/Enter, not per keystroke; out-of-range input snaps back.
function ProjectsLimitInput({
  value,
  onCommit,
}: {
  value: number
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState(String(value))

  function commit() {
    const parsed = Number.parseInt(draft, 10)
    if (
      Number.isInteger(parsed) &&
      parsed >= 1 &&
      parsed <= PROJECTS_LIMIT_MAX &&
      parsed !== value
    ) {
      onCommit(parsed)
      return
    }
    setDraft(String(value))
  }

  return (
    <Field orientation='horizontal' className='gap-2 px-2 py-1'>
      <Input
        type='number'
        inputMode='numeric'
        min={1}
        max={PROJECTS_LIMIT_MAX}
        aria-label='Quantidade de projetos na barra lateral'
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
        className='h-7 w-20'
      />
      projetos
    </Field>
  )
}

export function NavigationCustomizeDialog() {
  const navigation = useSidebarNavigation()
  const updatePreferences = useUpdateUserPreferences()

  function save(next: Partial<SidebarNavigation>) {
    updatePreferences.mutate({ navigation: { ...navigation, ...next } })
  }

  const limited = navigation.projectsLimit !== null

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label='Opções de exibição'
          >
            <NexoIcon icon={SlidersHorizontalIcon} strokeWidth={2} />
          </Button>
        }
      />
      <DialogContent className='min-w-xl flex min-h-0 flex-auto flex-col gap-4 overflow-clip p-4'>
        <DialogHeader className='pe-10'>
          <DialogTitle>Personalizar navegação</DialogTitle>
          <DialogDescription>
            Os itens selecionados ficam sempre visíveis na sua barra lateral.
            Você ainda encontra os demais a qualquer momento no menu "Mais".
            Essas alterações são pessoais e não afetam mais ninguém no seu
            espaço de trabalho.
          </DialogDescription>
        </DialogHeader>
        <div className='-m-0.5 min-h-0 min-w-0 flex-1 p-0.5 flex flex-col gap-5'>
          <SortableNavigationSection
            title='Pessoal'
            about='Personalize os recursos pessoais, escolha o que aparece na navegação à esquerda e arraste para definir uma ordem específica.'
            items={navigation.personal}
            meta={PERSONAL_NAV_ITEMS}
            onItemsChange={(personal) => save({ personal })}
          />
          <SortableNavigationSection
            title='Espaço de trabalho'
            about='Personalize os recursos do espaço de trabalho, escolha o que aparece na navegação à esquerda e arraste para definir uma ordem específica.'
            items={navigation.workspace}
            meta={WORKSPACE_NAV_ITEMS}
            onItemsChange={(workspace) => save({ workspace })}
          />

          <div className='flex flex-col gap-2'>
            <div className='flex items-center gap-1'>
              <span className='font-semibold'>Projetos</span>
              <AboutTooltip text='Personalize os projetos, escolha um estilo de navegação e, se quiser, limite quantos projetos aparecem na barra lateral.' />
            </div>
            <div className='bg-card flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2'>
              <Field orientation='horizontal' className='gap-2 px-2 py-1'>
                <Checkbox
                  id='nav-projects-limit'
                  checked={limited}
                  onCheckedChange={(checked) =>
                    save({
                      projectsLimit: checked ? DEFAULT_PROJECTS_LIMIT : null,
                    })
                  }
                />
                <FieldLabel htmlFor='nav-projects-limit'>
                  Mostrar projetos limitados na barra lateral
                </FieldLabel>
              </Field>
              {navigation.projectsLimit !== null && (
                <ProjectsLimitInput
                  // Remount on a server-side change so the draft follows it.
                  key={navigation.projectsLimit}
                  value={navigation.projectsLimit}
                  onCommit={(projectsLimit) => save({ projectsLimit })}
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
