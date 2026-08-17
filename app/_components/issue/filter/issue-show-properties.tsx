import {
  type IssueGroupBy,
  type IssueSortBy,
  useIssueListPreferences,
} from '@/components/layouts/use-issue-list-preferences'
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

export function IssueShowPropertiesDropdown() {
  const { preferences, update } = useIssueListPreferences()

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
                  className='gap-2'
                  value={preferences.groupBy}
                  onValueChange={(value) =>
                    update({ groupBy: value as IssueGroupBy })
                  }
                >
                  <Field orientation='horizontal'>
                    <RadioGroupItem value='state' className='size-3' />
                    <FieldLabel className='text-xs'>Estados</FieldLabel>
                  </Field>
                  <Field orientation='horizontal'>
                    <RadioGroupItem value='priority' className='size-3' />
                    <FieldLabel className='text-xs'>Prioridade</FieldLabel>
                  </Field>
                  <Field orientation='horizontal'>
                    <RadioGroupItem value='cycle' className='size-3' />
                    <FieldLabel className='text-xs'>Ciclo</FieldLabel>
                  </Field>
                  <Field orientation='horizontal'>
                    <RadioGroupItem value='module' className='size-3' />
                    <FieldLabel className='text-xs'>Módulo</FieldLabel>
                  </Field>
                  <Field orientation='horizontal'>
                    <RadioGroupItem value='labels' className='size-3' />
                    <FieldLabel className='text-xs'>Etiquetas</FieldLabel>
                  </Field>
                  <Field orientation='horizontal'>
                    <RadioGroupItem value='assignees' className='size-3' />
                    <FieldLabel className='text-xs'>Responsáveis</FieldLabel>
                  </Field>
                  <Field orientation='horizontal'>
                    <RadioGroupItem value='created-by' className='size-3' />
                    <FieldLabel className='text-xs'>Criado por</FieldLabel>
                  </Field>
                  <Field orientation='horizontal'>
                    <RadioGroupItem value='none' className='size-3' />
                    <FieldLabel className='text-xs'>Nenhum</FieldLabel>
                  </Field>
                </RadioGroup>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem className='py-2 space-y-1' value={'group-by'}>
              <AccordionTrigger className='bg-card w-full p-0 hover:no-underline text-xs text-muted-foreground'>
                Ordenar por
              </AccordionTrigger>
              <AccordionContent className='flex flex-col gap-2'>
                <RadioGroup
                  className='gap-2'
                  value={preferences.sortBy}
                  onValueChange={(value) =>
                    update({ sortBy: value as IssueSortBy })
                  }
                >
                  <Field orientation='horizontal'>
                    <RadioGroupItem value='manual' className='size-3' />
                    <FieldLabel className='text-xs'>
                      Manual - classificação
                    </FieldLabel>
                  </Field>
                  <Field orientation='horizontal'>
                    <RadioGroupItem value='created-at' className='size-3' />
                    <FieldLabel className='text-xs'>Criado em</FieldLabel>
                  </Field>
                  <Field orientation='horizontal'>
                    <RadioGroupItem value='updated-at' className='size-3' />
                    <FieldLabel className='text-xs'>Atualizado em</FieldLabel>
                  </Field>
                  <Field orientation='horizontal'>
                    <RadioGroupItem value='start-date' className='size-3' />
                    <FieldLabel className='text-xs'>Data de início</FieldLabel>
                  </Field>
                  <Field orientation='horizontal'>
                    <RadioGroupItem value='due-date' className='size-3' />
                    <FieldLabel className='text-xs'>
                      Data de vencimento
                    </FieldLabel>
                  </Field>
                  <Field orientation='horizontal'>
                    <RadioGroupItem value='priority' className='size-3' />
                    <FieldLabel className='text-xs'>Prioridade</FieldLabel>
                  </Field>
                </RadioGroup>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <FieldGroup className='gap-1.5'>
            <Field orientation='horizontal'>
              <Checkbox
                checked={preferences.showSubIssues}
                onCheckedChange={(checked) =>
                  update({ showSubIssues: checked === true })
                }
                className='size-3'
              />
              <FieldLabel className='text-xs'>Mostrar sub-issues</FieldLabel>
            </Field>
            <Field orientation='horizontal'>
              <Checkbox
                checked={preferences.showEmptyGroups}
                onCheckedChange={(checked) =>
                  update({ showEmptyGroups: checked === true })
                }
                className='size-3'
              />
              <FieldLabel className='text-xs'>Mostrar grupos vazios</FieldLabel>
            </Field>
          </FieldGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
