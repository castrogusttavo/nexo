'use client'

import { useRouter } from 'next/navigation'
import type * as React from 'react'
import type { Button } from '@/components/ui/button'
import { ProjectPicker } from './picker/project-picker'

interface IssueProjectSwitcherProps {
  workspaceId: string
  workspaceSlug: string
  projectSlug: string
  buttonVariant?: React.ComponentProps<typeof Button>['variant']
}

export function IssueProjectSwitcher({
  workspaceId,
  workspaceSlug,
  projectSlug,
  buttonVariant,
}: IssueProjectSwitcherProps) {
  const router = useRouter()

  return (
    <ProjectPicker
      workspaceId={workspaceId}
      value={projectSlug}
      onChange={(nextSlug) =>
        router.push(`/${workspaceSlug}/projects/${nextSlug}/issues`)
      }
      buttonVariant={buttonVariant}
    />
  )
}
