'use client'

import {
  CircleIcon,
  Moon01Icon,
  Sun03Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { TabsContent } from '@/components/ui/tabs'
import { notify } from '@/lib/notify'
import {
  useUpdateUserPreferences,
  useUserPreferences,
} from '@/src/hooks/use-user-preferences'
import type { UpdateUserPreferenceDTO } from '@/src/schemas/user-preference.schema'

const THEMES = [
  { icon: CircleIcon, label: 'Preferência do sistema', value: 'SYSTEM' },
  { icon: Sun03Icon, label: 'Claro', value: 'LIGHT' },
  { icon: Moon01Icon, label: 'Escuro', value: 'DARK' },
]

const SHORTCUTS = [
  { label: 'Enter', value: 'ENTER' },
  { label: 'Ctrl + Enter', value: 'CTRL_ENTER' },
]

const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
]

const TIMEZONES = Intl.supportedValuesOf('timeZone').map((tz) => ({
  value: tz,
  label: tz,
}))

export function UserModalPreferencesTab({ tab }: { tab: string }) {
  const { data: prefs, isLoading } = useUserPreferences()
  const update = useUpdateUserPreferences()

  function save(patch: UpdateUserPreferenceDTO) {
    update.mutate(patch, {
      onError: (error) =>
        notify.error(error instanceof Error ? error.message : 'Erro ao salvar'),
    })
  }

  if (isLoading || !prefs) {
    return (
      <TabsContent value={tab}>
        <Muted>Carregando preferências...</Muted>
      </TabsContent>
    )
  }

  const weekdayLabel =
    WEEKDAYS.find((d) => d.value === prefs.weekStartsOn)?.label ??
    'Selecionar dia da semana'

  const weekendLabel =
    prefs.weekendDays.length > 0
      ? prefs.weekendDays
          .slice()
          .sort((a, b) => a - b)
          .map((d) => WEEKDAYS[d]?.label.slice(0, 3))
          .join(', ')
      : 'Selecionar dias de fim de semana'

  return (
    <TabsContent value={tab}>
      <form
        onSubmit={(e) => e.preventDefault()}
        className='flex flex-col gap-7 w-full'
      >
        <div>
          <H4>Preferências</H4>
          <Muted>
            Personalize sua experiência no aplicativo do jeito que você trabalha
          </Muted>
        </div>
        <div className='flex flex-col gap-y-1'>
          <Field orientation='horizontal' className='py-3'>
            <FieldContent>
              <FieldLabel>Tema</FieldLabel>
              <FieldDescription>
                Selecione ou personalize o esquema de cores da sua interface.
              </FieldDescription>
            </FieldContent>
            <Select
              items={THEMES}
              value={prefs.theme}
              onValueChange={(value) =>
                save({
                  theme: value as UpdateUserPreferenceDTO['theme'],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                align='end'
                className='w-full'
              >
                <SelectGroup>
                  {THEMES.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>
                      <NexoIcon icon={theme.icon} size={12} />
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field orientation='horizontal' className='py-3'>
            <FieldContent>
              <FieldLabel>Cursor Suave</FieldLabel>
              <FieldDescription>
                Selecione o estilo de movimento do cursor que parece certo para
                você.
              </FieldDescription>
            </FieldContent>
            <Switch
              id='smooth-cursor'
              checked={prefs.smoothCursor}
              onCheckedChange={(checked) =>
                save({
                  smoothCursor: checked,
                })
              }
            />
          </Field>
          <Field orientation='horizontal' className='py-3'>
            <FieldContent>
              <FieldLabel>Atalho para enviar comentários</FieldLabel>
              <FieldDescription>
                Escolha o atalho de teclado para enviar comentários.
              </FieldDescription>
            </FieldContent>
            <Select
              items={SHORTCUTS}
              value={prefs.quickSendShortcut}
              onValueChange={(value) =>
                save({
                  quickSendShortcut:
                    value as UpdateUserPreferenceDTO['quickSendShortcut'],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                align='end'
                className='w-full'
              >
                <SelectGroup>
                  {SHORTCUTS.map((shortcut) => (
                    <SelectItem key={shortcut.value} value={shortcut.value}>
                      {shortcut.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className='flex flex-col gap-y-1'>
          <Field orientation='horizontal' className='py-3'>
            <FieldContent>
              <FieldLabel>Fuso horário</FieldLabel>
              <FieldDescription>
                Configuração atual de fuso horário.
              </FieldDescription>
            </FieldContent>
            <Select
              items={TIMEZONES}
              value={prefs.timezone}
              onValueChange={(value) =>
                save({
                  timezone: value as string,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                align='end'
                className='w-full'
              >
                <SelectGroup>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field orientation='horizontal' className='py-3'>
            <FieldContent>
              <FieldLabel>Primeiro dia da semana</FieldLabel>
              <FieldDescription>
                Escolha o dia em que sua semana começa.
              </FieldDescription>
            </FieldContent>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant='secondary'>{weekdayLabel}</Button>}
              />
              <DropdownMenuContent>
                <DropdownMenuRadioGroup
                  value={String(prefs.weekStartsOn)}
                  onValueChange={(value) =>
                    save({
                      weekStartsOn: Number(value),
                    })
                  }
                >
                  {WEEKDAYS.map((day) => (
                    <DropdownMenuRadioItem
                      key={day.value}
                      value={String(day.value)}
                    >
                      {day.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </Field>
          <Field orientation='horizontal' className='py-3'>
            <FieldContent>
              <FieldLabel>Dias de fim de semana</FieldLabel>
              <FieldDescription>
                Define quais dias são tratados como tempo não trabalhado.
              </FieldDescription>
            </FieldContent>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant='secondary'>{weekendLabel}</Button>}
              />
              <DropdownMenuContent>
                {WEEKDAYS.map((day) => (
                  <DropdownMenuCheckboxItem
                    key={day.value}
                    closeOnClick={false}
                    checked={prefs.weekendDays.includes(day.value)}
                    onCheckedChange={(checked) =>
                      save({
                        weekendDays: checked
                          ? [...prefs.weekendDays, day.value].sort(
                              (a, b) => a - b,
                            )
                          : prefs.weekendDays.filter((d) => d !== day.value),
                      })
                    }
                  >
                    {day.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </Field>
        </div>
      </form>
    </TabsContent>
  )
}
