'use client'

import {
  Archive01Icon,
  File02Icon,
  MoreHorizontalIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useArchiveWikiPage, useWikiPages } from '@/src/hooks/use-wiki-page'
import type { WikiPageDTO } from '@/types/wiki-page'

interface WikiPageNode extends WikiPageDTO {
  children: WikiPageNode[]
}

function buildTree(pages: WikiPageDTO[]): WikiPageNode[] {
  const nodes = new Map<string, WikiPageNode>(
    pages.map((page) => [page.id, { ...page, children: [] }]),
  )
  const roots: WikiPageNode[] = []

  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  return roots
}

export function WikiSidebarTree({
  workspaceId,
  workspaceSlug,
}: {
  workspaceId: string
  workspaceSlug: string
}) {
  const { data: pages, isLoading } = useWikiPages(workspaceId)
  const tree = useMemo(() => buildTree(pages ?? []), [pages])

  if (isLoading) return null

  if (!tree.length) {
    return <Muted className='px-2.5'>Nenhuma página ainda.</Muted>
  }

  return (
    <div className='space-y-0.5'>
      {tree.map((node) => (
        <WikiSidebarTreeItem
          key={node.id}
          node={node}
          depth={0}
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
        />
      ))}
    </div>
  )
}

function WikiSidebarTreeItem({
  node,
  depth,
  workspaceId,
  workspaceSlug,
}: {
  node: WikiPageNode
  depth: number
  workspaceId: string
  workspaceSlug: string
}) {
  const pathname = usePathname()
  const href = `/${workspaceSlug}/wiki/${node.id}`
  const isActive = pathname === href
  const archiveWikiPage = useArchiveWikiPage(workspaceId, node.id)

  return (
    <div>
      <div className='group flex items-center'>
        <Link href={href} className='flex-1 min-w-0'>
          <Button
            variant={isActive ? 'secondary' : 'ghost'}
            size='sm'
            className='w-full justify-start gap-2'
            style={{ paddingLeft: `${depth * 12 + 10}px` }}
          >
            <NexoIcon icon={File02Icon} strokeWidth={2} />
            <span className='truncate'>{node.title || 'Sem título'}</span>
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant='ghost'
                size='icon-sm'
                className='opacity-0 group-hover:opacity-100 shrink-0'
              >
                <NexoIcon icon={MoreHorizontalIcon} strokeWidth={2} />
              </Button>
            }
          />
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => archiveWikiPage.mutate()}>
              <NexoIcon icon={Archive01Icon} strokeWidth={2} />
              Arquivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <WikiSidebarTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
            />
          ))}
        </div>
      )}
    </div>
  )
}
