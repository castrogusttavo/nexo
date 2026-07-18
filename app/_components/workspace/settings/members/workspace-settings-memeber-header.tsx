import { Search01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { WorkspaceSettingsMemberImportDialog } from './dialog/workspace-settings-member-import-users'
import { WorkspaceSettingsMemberInviteDialog } from './dialog/workspace-settings-member-invite-dialog'
import { WorkspaceSettingsMemberFilterRole } from './workspace-settings-member-filter-role'

interface WorkspaceSettingsMemberHeaderProps {
  workspaceId: string
  search: string
  onSearchChange: (value: string) => void
  roles: string[]
  onRolesChange: (values: string[]) => void
  resultCount: number
}

export function WorkspaceSettingsMemberHeader({
  workspaceId,
  search,
  onSearchChange,
  roles,
  onRolesChange,
  resultCount,
}: WorkspaceSettingsMemberHeaderProps) {
  return (
    <div className='flex justify-between gap-4 pb-3.5 items-center'>
      <span>Pessoas</span>
      <div className='flex items-center gap-2 max-h-8'>
        <InputGroup className='flex items-center gap-.15 rounded-md px-2.5! py-1.5! max-w-3xs max-h-8'>
          <InputGroupInput
            placeholder='Pesquisa...'
            className='p-0'
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          <InputGroupAddon className='p-0'>
            <NexoIcon icon={Search01Icon} />
          </InputGroupAddon>
          <InputGroupAddon align='inline-end' className='p-0'>
            {resultCount} result{resultCount === 1 ? '' : 's'}
          </InputGroupAddon>
        </InputGroup>
        <WorkspaceSettingsMemberFilterRole
          selected={roles}
          onChange={onRolesChange}
        />
        <WorkspaceSettingsMemberImportDialog workspaceId={workspaceId} />
        <WorkspaceSettingsMemberInviteDialog workspaceId={workspaceId} />
      </div>
    </div>
  )
}
