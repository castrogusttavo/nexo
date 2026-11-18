'use client'

import { ProjectReactionPicker } from '@/app/_components/workspace/project/project-reaction-picker'
import { notify } from '@/lib/notify'
import {
  useProjectReactions,
  useToggleProjectReaction,
} from '@/src/hooks/use-project-reactions'

export function ProjectReactionList({
  workspaceId,
  projectSlug,
}: {
  workspaceId: string
  projectSlug: string
}) {
  const { data: reactions = [] } = useProjectReactions(workspaceId, projectSlug)
  const react = useToggleProjectReaction(workspaceId, projectSlug)

  return (
    <ProjectReactionPicker
      reactions={reactions}
      variant='ghost'
      onToggle={(emoji, reacted) =>
        react.mutate(
          { emoji, reacted },
          { onError: (error) => notify.error(error, 'Erro ao reagir') },
        )
      }
    />
  )
}
