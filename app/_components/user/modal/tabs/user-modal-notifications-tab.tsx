'use client'

import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { TabsContent } from '@/components/ui/tabs'
import { notify } from '@/lib/notify'
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from '@/src/hooks/user-notification-settings'
import type { UpdateNotificationSettingDTO } from '@/src/schemas/notification-settings.schema'

const OPTIONS = [
  {
    key: 'priorityChanges',
    label: 'Alterações de propriedade',
    description:
      'Notifique-me quando as propriedades dos itens de trabalho, como responsáveis, prioridade, estimativas ou qualquer outra coisa, mudarem.',
  },
  {
    key: 'stateChanges',
    label: 'Mudança de estado',
    description:
      'Notifique-me quando os itens de trabalho mudarem para um estado diferente',
  },
  {
    key: 'comments',
    label: 'Comentários',
    description:
      'Notifique-me quando alguém deixar um comentário no item de trabalho',
  },
  {
    key: 'mentions',
    label: 'Menções',
    description:
      'Notifique-me apenas quando alguém me mencionar nos comentários ou na descrição',
  },
] satisfies {
  key: keyof UpdateNotificationSettingDTO
  label: string
  description: string
}[]

export function UserModalNotificationsTab({ tab }: { tab: string }) {
  const { data: settings, isLoading } = useNotificationSettings()
  const update = useUpdateNotificationSettings()

  function save(patch: UpdateNotificationSettingDTO) {
    update.mutate(patch, {
      onSuccess: () =>
        notify.success('Preferências de notificação atualizadas'),
      onError: (error) =>
        notify.error(error instanceof Error ? error.message : 'Erro ao salvar'),
    })
  }

  if (isLoading || !settings) {
    return (
      <TabsContent value={tab}>
        <Muted>Carregando notificações...</Muted>
      </TabsContent>
    )
  }

  return (
    <TabsContent value={tab}>
      <form
        onSubmit={(e) => e.preventDefault()}
        className='flex flex-col gap-7 w-full'
      >
        <div>
          <H4>Notificações por e-mail</H4>
          <Muted>
            Mantenha-se informado sobre os itens de trabalho aos quais você está
            inscrito. Ative isso para ser notificado.
          </Muted>
        </div>
        <div className='flex flex-col gap-y-1'>
          {OPTIONS.map((option) => (
            <Field key={option.key} orientation='horizontal' className='py-3'>
              <FieldContent>
                <FieldLabel>{option.label}</FieldLabel>
                <FieldDescription>{option.description}</FieldDescription>
              </FieldContent>
              <Switch
                id={option.key}
                checked={settings[option.key]}
                onCheckedChange={(checked) => save({ [option.key]: checked })}
              />
            </Field>
          ))}
        </div>
      </form>
    </TabsContent>
  )
}
