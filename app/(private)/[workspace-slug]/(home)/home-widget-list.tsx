'use client'

import { Fragment, type ReactNode } from 'react'
import { Muted } from '@/components/typography/text/muted'
import { useHomeWidgets } from '@/src/hooks/use-user-preferences'
import type {
  HomeWidget,
  HomeWidgets,
} from '@/src/schemas/user-preference.schema'

// The widgets are rendered on the server and handed in by id; this only
// decides which show and in what order, so a toggle in the dialog applies
// at once (the preference query updates optimistically).
export function HomeWidgetList({
  initialWidgets,
  widgets,
}: {
  initialWidgets: HomeWidgets
  widgets: Record<HomeWidget, ReactNode>
}) {
  const visible = useHomeWidgets(initialWidgets).filter((w) => w.visible)

  if (visible.length === 0) {
    return (
      <Muted className='text-center'>
        Todos os widgets estão ocultos. Use Gerenciar widgets para mostrar
        algum.
      </Muted>
    )
  }

  return visible.map((widget) => (
    <Fragment key={widget.id}>{widgets[widget.id]}</Fragment>
  ))
}
