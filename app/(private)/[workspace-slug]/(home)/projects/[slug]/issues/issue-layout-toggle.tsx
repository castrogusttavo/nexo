'use client'

import {
  Calendar04Icon,
  LayoutTwoColumnIcon,
  Menu01Icon,
  TableIcon,
  TimelineListIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import {
  LayoutOptions,
  OptionButton,
} from '@/components/layouts/layout-options'
import { useIssueLayout } from '@/components/layouts/use-issue-layout'

export function IssueLayoutToggle() {
  const [layout, setLayout] = useIssueLayout()

  return (
    <LayoutOptions>
      <OptionButton
        content='Layout de lista'
        active={layout === 'list'}
        onClick={() => setLayout('list')}
      >
        <NexoIcon strokeWidth={2} icon={Menu01Icon} />
      </OptionButton>
      <OptionButton
        content='Layout de kanban'
        active={layout === 'kanban'}
        onClick={() => setLayout('kanban')}
      >
        <NexoIcon strokeWidth={2} icon={LayoutTwoColumnIcon} />
      </OptionButton>
      <OptionButton
        content='Layout de calendário'
        active={layout === 'calendar'}
        onClick={() => setLayout('calendar')}
      >
        <NexoIcon strokeWidth={2} icon={Calendar04Icon} />
      </OptionButton>
      <OptionButton
        content='Layout de tabela'
        active={layout === 'table'}
        onClick={() => setLayout('table')}
      >
        <NexoIcon strokeWidth={2} icon={TableIcon} />
      </OptionButton>
      <OptionButton
        content='Layout de cronograma'
        active={layout === 'timeline'}
        onClick={() => setLayout('timeline')}
      >
        <NexoIcon strokeWidth={2} icon={TimelineListIcon} />
      </OptionButton>
    </LayoutOptions>
  )
}
