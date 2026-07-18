'use client'

import { DataTableFacetedFilter } from '@/components/ui/data-table/data-table-faceted-filter'
import { MemberRoleFilterValues } from '@/src/schemas/member.schema'

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Dono',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
  VIEWER: 'Visualizador',
}

const ROLE_OPTIONS = MemberRoleFilterValues.map((value) => ({
  value,
  label: ROLE_LABEL[value],
}))

interface WorkspaceSettingsMemberFilterRoleProps {
  selected: string[]
  onChange: (values: string[]) => void
}

export function WorkspaceSettingsMemberFilterRole({
  selected,
  onChange,
}: WorkspaceSettingsMemberFilterRoleProps) {
  return (
    <DataTableFacetedFilter
      title='Cargos'
      options={ROLE_OPTIONS}
      selected={selected}
      onChange={onChange}
    />
  )
}
