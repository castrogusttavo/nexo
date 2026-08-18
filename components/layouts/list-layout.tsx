import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { NexoIcon } from "../icon/icon";
import { Button } from "../ui/button";
import { Add01Icon } from "@hugeicons-pro/core-stroke-rounded";
import { Badge } from "../ui/badge";
import { IssueCardList } from "@/app/_components/issue/issue-card";
import { Checkbox } from "../ui/checkbox";
import { IssueDTO, IssuePriorityDTO } from "@/types/issue";
import { StateDTO } from "@/types/state";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { issuesKey, useCreateIssue } from "@/src/hooks/use-issue";
import { apiFetchJson } from "@/src/hooks/_fetch";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "../ui/input";
import { EMPTY_ISSUE_DESCRIPTION } from "@/lib/editor-value";

export type IconType = Parameters<typeof NexoIcon>[0]['icon']

interface SectionAvatar {
  image: string | null
  name: string
  username: string
}

export interface ListLayoutCreateDefaults {
  stateId: string | undefined
  priority?: IssuePriorityDTO
  cycleId?: string
  moduleId?: string
  labelIdToAttach?: string
  assigneeIdToAssign?: string
}

interface ListLayoutItem {
  issue: IssueDTO
  state: StateDTO | undefined
  identifier: string
  href: string
}

interface ListLayoutProps {
  workspaceId: string
  projectSlug: string
  createDefaults: ListLayoutCreateDefaults
  sectionId: string
  sectionIcon?: IconType
  sectionIconColor?: string
  sectionIconStrokeWidth?: number
  sectionAvatar?: SectionAvatar
  sectionName: string
  items: ListLayoutItem[]
  selectedIds: Set<string>
  onToggleOne: (issueId: string) => void
  onToggleGroup: (issueId: string[]) => void
}

export function ListLayout({ workspaceId, projectSlug, createDefaults, sectionId, sectionIcon, sectionIconColor, sectionIconStrokeWidth, sectionAvatar, sectionName, items, selectedIds, onToggleOne, onToggleGroup }: ListLayoutProps) {
  const issueIds = items.map((item) => item.issue.id)
  const selectedCount = issueIds.filter((id) => selectedIds.has(id)).length
  const allSelected = issueIds.length > 0 && selectedCount === issueIds.length
  const someSelected = selectedCount > 0 && !allSelected

  const queryClient = useQueryClient()
  const createIssue = useCreateIssue(workspaceId, projectSlug)
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState('')

  async function submitCreate() {
    if (!title.trim() || !createDefaults.stateId) return

    const created = await createIssue.mutateAsync({
      title: title.trim(),
      description: EMPTY_ISSUE_DESCRIPTION,
      stateId: createDefaults.stateId,
      priority: createDefaults.priority,
      cycleId: createDefaults.cycleId,
      moduleId: createDefaults.moduleId,
    })

    if (createDefaults.labelIdToAttach) {
      await apiFetchJson(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${created.id}/labels`,
        'POST',
        { labelId: createDefaults.labelIdToAttach },
      )
    }
    if (createDefaults.assigneeIdToAssign) {
      await apiFetchJson(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${created.id}/assignees`,
        'POST',
        { userId: createDefaults.assigneeIdToAssign },
      )
    }
    if (createDefaults.labelIdToAttach || createDefaults.assigneeIdToAssign) {
      queryClient.invalidateQueries({ queryKey: issuesKey(workspaceId, projectSlug) })
    }

    setTitle('')
    setIsCreating(false)
  }

  function cancelCreate() {
    setTitle('')
    setIsCreating(false)
  }

  return (
    <Accordion defaultValue={[sectionId]} className='p-0 m-0'>
      <AccordionItem value={sectionId} className='p-0 m-0'>
        <AccordionTrigger nativeButton={false} render={
          <div className='hover:no-underline! flex-1 group bg-card rounded-none w-full pr-3 pl-5 py-1 flex items-center justify-between border-b border-border'>
            <div className="flex items-center gap-2"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Checkbox
                className={`opacity-0 group-hover:opacity-100 ${allSelected ? 'opacity-100' : ''}`}
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={() => onToggleGroup(issueIds)}
              />
              <div className="flex items-center gap-2">
                {sectionAvatar ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Avatar size='sm'>
                          <AvatarImage src={sectionAvatar.image ?? undefined} alt={sectionAvatar.name} />
                          <AvatarFallback>{sectionAvatar.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      }
                    />
                    <TooltipContent>@{sectionAvatar.username}</TooltipContent>
                  </Tooltip>
                ) : (
                  sectionIcon && (
                    <NexoIcon
                      icon={sectionIcon}
                      strokeWidth={sectionIconStrokeWidth}
                      className={sectionIconColor}
                    />
                  )
                )}
                <h3>{sectionName}</h3>
                <Badge variant='outline'>{items.length}</Badge>
              </div>
            </div>
            <Button size='icon-xs' variant='ghost' onClick={() => setIsCreating(true)}>
              <NexoIcon icon={Add01Icon} strokeWidth={2} />
            </Button>
          </div>
        } />
        <AccordionContent className='p-0 m-0 border-b border-border'>
          {items.map(({ issue, identifier, href }) => (
            <IssueCardList
              key={issue.id}
              workspaceId={workspaceId}
              projectSlug={projectSlug}
              issue={issue}
              identifier={identifier}
              selected={selectedIds.has(issue.id)}
              onToggleSelected={() => onToggleOne(issue.id)}
            />
          ))}
          {isCreating ? (
            <div className='flex flex-col gap-1 px-5 py-3'>
              <Input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder='Nome da issue'
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitCreate()
                  if (event.key === 'Escape') cancelCreate()
                }}
                onBlur={cancelCreate}
              />
              <span className='text-muted-foreground text-xs'>{/* texto a definir */}</span>
            </div>
          ) : (
            <Button
              variant='ghost'
              className='w-full min-w-full max-w-full h-auto rounded-none justify-start py-3 px-5 m-0 border-none'
              onClick={() => setIsCreating(true)}
            >
              <NexoIcon icon={Add01Icon} strokeWidth={2} />
              Nova issue
            </Button>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
