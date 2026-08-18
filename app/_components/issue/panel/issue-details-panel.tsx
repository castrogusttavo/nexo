'use client'

import { IssueRichEditor } from '@/components/editor/rich-editor'
import { useIsMobile } from '@/components/hooks/use-mobile'
import { H4 } from '@/components/typography/heading/h4'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { useUpdateIssue } from '@/src/hooks/use-issue'
import type { IssueDTO } from '@/types/issue'

interface IssueDetailsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  issue: IssueDTO
  workspaceId: string
  projectSlug: string
}

export function IssueDetailsPanel({
  open,
  onOpenChange,
  issue,
  projectSlug,
  workspaceId,
}: IssueDetailsPanelProps) {
  const isMobile = useIsMobile()
  const updateIssue = useUpdateIssue(workspaceId, projectSlug)

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? 'down' : 'right'}
    >
      <DrawerContent className='w-full max-w-2xl'>
        <div className='flex flex-col gap-4 p-4'>
          <H4>{issue.title}</H4>
          <IssueRichEditor
            key={issue.id}
            workspaceId={workspaceId}
            projectSlug={projectSlug}
            content={issue.description}
            onChange={(description) =>
              updateIssue.mutate({ issueId: issue.id, data: { description } })
            }
            className='prose prose-sm dark:prose-invert max-w-none'
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
