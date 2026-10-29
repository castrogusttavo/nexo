'use client'

import {
  DragDropVerticalIcon,
  Shapes01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable'
import { Switch } from '@/components/ui/switch'
import {
  useUpdateUserPreferences,
  useUserPreferences,
} from '@/src/hooks/use-user-preferences'
import type { HomeWidgets } from '@/src/schemas/user-preference.schema'
import { HOME_WIDGET_LABELS } from './home-widgets'

export function HomeWidgetsDialog() {
  const { data } = useUserPreferences()
  const updatePreferences = useUpdateUserPreferences()
  const widgets = data?.homeWidgets

  function save(homeWidgets: HomeWidgets) {
    updatePreferences.mutate({ homeWidgets })
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant='outline' size='xs'>
            <NexoIcon icon={Shapes01Icon} />
            <span className='max-sm:sr-only'>Gerenciar widgets</span>
          </Button>
        }
      />
      <DialogContent className='flex flex-col gap-4 p-4 min-w-120'>
        <DialogHeader className='pe-10'>
          <DialogTitle>Gerenciar widgets</DialogTitle>
        </DialogHeader>
        {widgets && (
          <Sortable
            value={widgets}
            onValueChange={save}
            getItemValue={(widget) => widget.id}
            strategy='vertical'
            className='flex flex-col gap-1.5 rounded-lg'
          >
            {widgets.map((widget) => {
              const label = HOME_WIDGET_LABELS[widget.id]
              const id = `home-widget-${widget.id}`
              return (
                <SortableItem key={widget.id} value={widget.id}>
                  <div className='flex items-center gap-2 hover:bg-accent px-2 py-2 rounded-sm'>
                    <SortableItemHandle
                      aria-label={`Reordenar ${label}`}
                      className='cursor-grab text-muted-foreground hover:text-foreground'
                    >
                      <NexoIcon icon={DragDropVerticalIcon} strokeWidth={2} />
                    </SortableItemHandle>
                    <Field
                      orientation='horizontal'
                      className='flex-1 justify-between gap-2'
                    >
                      <FieldLabel htmlFor={id}>{label}</FieldLabel>
                      <Switch
                        id={id}
                        checked={widget.visible}
                        onCheckedChange={(visible) =>
                          save(
                            widgets.map((w) =>
                              w.id === widget.id ? { ...w, visible } : w,
                            ),
                          )
                        }
                      />
                    </Field>
                  </div>
                </SortableItem>
              )
            })}
          </Sortable>
        )}
      </DialogContent>
    </Dialog>
  )
}
