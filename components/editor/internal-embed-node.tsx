'use client'

import { useIssueByIdentifier } from "@/src/hooks/use-issue"
import { useStates } from "@/src/hooks/use-state"
import { mergeAttributes, Node, NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"
import Link from "next/link"
import { NexoIcon } from "../icon/icon"
import { issueStateIconMap } from "@/app/_components/issue/issue-icons"
import { colorToText } from "@/lib/state-colors"
import { useCycle } from "@/src/hooks/use-cycle"

export interface InternalEmbedOptions {
  workspaceId: string
  workspaceSlug: string
  projectSlug: string
}

export const InternalEmbed = Node.create<InternalEmbedOptions>({
  name: 'internalEmbed',
  group: 'block',
  atom: true,

  addOptions() {
    return { workspaceId: '', workspaceSlug: '', projectSlug: '' }
  },

  addAttributes() {
    return {
      entityType: { default: 'issue' },
      entityRef: { default: null }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-internal-embed]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-internal-embed': '' })]
  },

  addNodeView() {
    const options = this.options
    return ReactNodeViewRenderer((props: NodeViewProps) => (
      <InternalEmbedView {...props} options={options} />
    ))
  },
})

function InternalEmbedView({ node, options }: NodeViewProps & { options: InternalEmbedOptions }) {
  const { entityType, entityRef } = node.attrs as {
    entityType: 'issue' | 'cycle'
    entityRef: string | null
  }

  return entityType === 'cycle' ? (
    <CycleEmbedCard options={options} cycleId={entityRef} />
  ) : (
    <IssueEmbedCard options={options} identifier={entityRef} />
  )
}

function IssueEmbedCard({
  options,
  identifier,
}: {
  options: InternalEmbedOptions
  identifier: string | null
}) {
  const { data: issue } = useIssueByIdentifier(options.workspaceId, options.projectSlug, identifier ?? undefined)
  const { data: states } = useStates(options.workspaceId, options.projectSlug)
  const state = states?.find((s) => s.id === issue?.stateId)

  return (
    <NodeViewWrapper>
      <Link
        href={`/${options.workspaceSlug}/projects/${options.projectSlug}/issues/${identifier}`}
        className='flex items-center gap-2 rounded-md border border-border p-2 hover:bg-accent/50'
      >
        {state && (
          <NexoIcon
            icon={issueStateIconMap[state.group].icon}
            strokeWidth={issueStateIconMap[state.group].strokeWidth}
            className={colorToText(state.color)}
          />
        )}
        <span className='text-muted-foreground text-xs'>{identifier}</span>
        <span className='truncate text-sm'>{issue?.title ?? 'Carregando...'}</span>
      </Link>
    </NodeViewWrapper>
  )
}

function CycleEmbedCard({ options, cycleId }: { options: InternalEmbedOptions; cycleId: string | null }) {
  const { data: cycle } = useCycle(options.workspaceId, options.projectSlug, cycleId ?? undefined)

  return (
    <NodeViewWrapper>
      <div className='flex items-center gap-2 rounded-md border border-border p-2'>
        <span className='truncate text-sm'>{cycle?.name ?? 'Carregando...'}</span>
        {cycle && <span className='text-muted-foreground text-xs'>{cycle.status}</span>}
      </div>
    </NodeViewWrapper>
  )
}
