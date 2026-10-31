'use client'

import {
  Appointment01Icon,
  CalendarClockIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { DatePicker } from '@/app/_components/workspace/project/issue/picker/date-picker'
import { ProjectDetailsFieldRow } from './project-details-field-row'
import type { ProjectDetailsFieldProps } from './project-details-types'

// Start and due date. The API refuses a due date before the start (the toast
// shows its message); `null` clears a date.
export function ProjectDetailsDatesField({
  project,
  canManage,
  pending,
  save,
}: ProjectDetailsFieldProps) {
  return (
    <>
      <ProjectDetailsFieldRow icon={CalendarClockIcon} label='Data de início'>
        <DatePicker
          label='Sem data'
          value={project.startDate}
          disabled={!canManage || pending}
          onChange={(startDate) =>
            save({ startDate }, 'Data de início atualizada')
          }
          className='w-3/5 justify-start'
        />
      </ProjectDetailsFieldRow>
      <ProjectDetailsFieldRow
        icon={Appointment01Icon}
        label='Data de conclusão'
      >
        <DatePicker
          label='Sem data'
          value={project.dueDate}
          disabled={!canManage || pending}
          onChange={(dueDate) =>
            save({ dueDate }, 'Data de conclusão atualizada')
          }
          className='w-3/5 justify-start'
        />
      </ProjectDetailsFieldRow>
    </>
  )
}
