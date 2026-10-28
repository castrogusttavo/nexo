'use client'

import {
  Calendar04Icon,
  LayoutTwoColumnIcon,
  Menu01Icon,
  TableIcon,
  TimelineListIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import {
  IssueLayoutOptionButton,
  IssueLayoutOptions,
} from '@/app/_components/workspace/project/issue/layout/issue-layout-options'
import { useIssueLayout } from '@/app/_components/workspace/project/issue/layout/use-issue-layout'
import { NexoIcon } from '@/components/icon/icon'

export function IssueLayoutToggle() {
  const [layout, setLayout] = useIssueLayout()

  return (
    <IssueLayoutOptions>
      <IssueLayoutOptionButton
        content='Layout de lista'
        active={layout === 'list'}
        onClick={() => setLayout('list')}
      >
        <NexoIcon strokeWidth={2} icon={Menu01Icon} />
      </IssueLayoutOptionButton>
      <IssueLayoutOptionButton
        content='Layout de kanban'
        active={layout === 'kanban'}
        onClick={() => setLayout('kanban')}
      >
        <NexoIcon strokeWidth={2} icon={LayoutTwoColumnIcon} />
      </IssueLayoutOptionButton>
      <IssueLayoutOptionButton
        content='Layout de calendário'
        active={layout === 'calendar'}
        onClick={() => setLayout('calendar')}
      >
        <NexoIcon strokeWidth={2} icon={Calendar04Icon} />
      </IssueLayoutOptionButton>
      <IssueLayoutOptionButton
        content='Layout de tabela'
        active={layout === 'table'}
        onClick={() => setLayout('table')}
      >
        <NexoIcon strokeWidth={2} icon={TableIcon} />
      </IssueLayoutOptionButton>
      <IssueLayoutOptionButton
        content='Layout de cronograma'
        active={layout === 'timeline'}
        onClick={() => setLayout('timeline')}
      >
        <NexoIcon strokeWidth={2} icon={TimelineListIcon} />
      </IssueLayoutOptionButton>
    </IssueLayoutOptions>
  )
}
