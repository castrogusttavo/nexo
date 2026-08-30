import { PanelLeftIcon } from '@hugeicons-pro/core-stroke-rounded'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  ContextHeader,
  ContextSidebar,
} from '@/app/_components/navigation/sidebar-context'
import { WikiCreatePageButton } from '@/app/_components/wiki/wiki-create-page-button'
import { WikiSidebarTree } from '@/app/_components/wiki/wiki-sidebar-tree'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { getWikiContext } from '@/src/lib/wiki-context'

export default async function WikiLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ 'workspace-slug': string }>
}) {
  const { 'workspace-slug': workspaceSlug } = await params
  const context = await getWikiContext(workspaceSlug)
  if (!context) notFound()

  return (
    <>
      <ContextSidebar>
        <ContextHeader
          title='Wiki'
          actions={
            <Button variant='ghost' size='icon-sm'>
              <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
            </Button>
          }
          primaryAction={
            <WikiCreatePageButton
              workspaceId={context.workspaceId}
              workspaceSlug={workspaceSlug}
            />
          }
        />
        <WikiSidebarTree
          workspaceId={context.workspaceId}
          workspaceSlug={workspaceSlug}
        />
      </ContextSidebar>
      {children}
    </>
  )
}
