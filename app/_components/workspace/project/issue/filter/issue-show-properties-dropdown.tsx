import { useId } from 'react'
import {
  type IssueGroupBy,
  type IssueSortBy,
  useIssueListPreferences,
} from '@/app/_components/workspace/project/issue/layout/use-issue-list-preferences'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const GROUP_BY_OPTIONS: { value: IssueGroupBy; label: string }[] = [
  { value: 'state', label: 'Estados' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'cycle', label: 'Ciclo' },
  { value: 'module', label: 'Módulo' },
  { value: 'labels', label: 'Etiquetas' },
  { value: 'assignees', label: 'Responsáveis' },
  { value: 'created-by', label: 'Criado por' },
  { value: 'none', label: 'Nenhum' },
]

const SORT_BY_OPTIONS: { value: IssueSortBy; label: string }[] = [
  { value: 'manual', label: 'Manual - classificação' },
  { value: 'created-at', label: 'Criado em' },
  { value: 'updated-at', label: 'Atualizado em' },
  { value: 'start-date', label: 'Data de início' },
  { value: 'due-date', label: 'Data de vencimento' },
  { value: 'priority', label: 'Prioridade' },
]

export function IssueShowPropertiesDropdown() {
  const { preferences, update } = useIssueListPreferences()
  // Every label points at its control by id; useId keeps the ids unique if
  // the dropdown is ever rendered twice on a page.
  const id = useId()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant='outline' size='sm' className='h-8'>
            Exibir
          </Button>
        }
      />
      <DropdownMenuContent className='flex flex-col overflow-hidden max-h-120 w-[20rem] py-0 px-3 m-0'>
        <div className='flex-1 min-h-0 overflow-y-auto no-scrollbar'>
          <Accordion multiple defaultValue={['properties', 'group-by']}>
            <AccordionItem className='py-2 space-y-1' value={'properties'}>
              <AccordionTrigger className='bg-card w-full p-0 hover:no-underline text-xs text-muted-foreground sticky top-0'>
                Agrupado por
              </AccordionTrigger>
              <AccordionContent className='flex flex-col gap-2'>
                <RadioGroup
                  aria-label='Agrupado por'
                  className='gap-2'
                  value={preferences.groupBy}
                  onValueChange={(value) =>
                    update({ groupBy: value as IssueGroupBy })
                  }
                >
                  {GROUP_BY_OPTIONS.map((option) => (
                    <IssueShowPropertiesOption
                      key={option.value}
                      id={`${id}-group-${option.value}`}
                      {...option}
                    />
                  ))}
                </RadioGroup>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem className='py-2 space-y-1' value={'group-by'}>
              <AccordionTrigger className='bg-card w-full p-0 hover:no-underline text-xs text-muted-foreground'>
                Ordenar por
              </AccordionTrigger>
              <AccordionContent className='flex flex-col gap-2'>
                <RadioGroup
                  aria-label='Ordenar por'
                  className='gap-2'
                  value={preferences.sortBy}
                  onValueChange={(value) =>
                    update({ sortBy: value as IssueSortBy })
                  }
                >
                  {SORT_BY_OPTIONS.map((option) => (
                    <IssueShowPropertiesOption
                      key={option.value}
                      id={`${id}-sort-${option.value}`}
                      {...option}
                    />
                  ))}
                </RadioGroup>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <FieldGroup className='gap-1.5'>
            <Field orientation='horizontal'>
              <Checkbox
                id={`${id}-sub-issues`}
                checked={preferences.showSubIssues}
                onCheckedChange={(checked) =>
                  update({ showSubIssues: checked === true })
                }
                className='size-3'
              />
              <FieldLabel htmlFor={`${id}-sub-issues`} className='text-xs'>
                Mostrar sub-issues
              </FieldLabel>
            </Field>
            <Field orientation='horizontal'>
              <Checkbox
                id={`${id}-empty-groups`}
                checked={preferences.showEmptyGroups}
                onCheckedChange={(checked) =>
                  update({ showEmptyGroups: checked === true })
                }
                className='size-3'
              />
              <FieldLabel htmlFor={`${id}-empty-groups`} className='text-xs'>
                Mostrar grupos vazios
              </FieldLabel>
            </Field>
          </FieldGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function IssueShowPropertiesOption({
  id,
  value,
  label,
}: {
  id: string
  value: string
  label: string
}) {
  return (
    <Field orientation='horizontal'>
      <RadioGroupItem id={id} value={value} className='size-3' />
      <FieldLabel htmlFor={id} className='text-xs'>
        {label}
      </FieldLabel>
    </Field>
  )
}
