'use client'

import {
  Notification01Icon,
  PreferenceHorizontalIcon,
  Settings01Icon,
  SquareLock01Icon,
  UserCircleIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getInitials } from '@/lib/user-name-initials'
import { useUser } from '@/src/hooks/use-user'
import { UserModalNotificationsTab } from './tabs/user-modal-notifications-tab'
import { UserModalPreferencesTab } from './tabs/user-modal-preferences-tab'
import { UserModalProfileTab } from './tabs/user-modal-profile-tab'
import { UserModalSecurityTab } from './tabs/user-modal-security-tab'

export type ProfileTab =
  | 'profile'
  | 'preferences'
  | 'notifications'
  | 'security'

export const profileTriggers = {
  profile: { name: 'Configurações', icon: Settings01Icon },
  preferences: { name: 'Preferências', icon: PreferenceHorizontalIcon },
} satisfies Partial<
  Record<ProfileTab, { name: string; icon: typeof Settings01Icon }>
>

interface UserModalCustomProfileProps {
  tab: ProfileTab | null
  onOpenChange: (open: boolean) => void
}

export function UserModalCustomProfile({
  tab,
  onOpenChange,
}: UserModalCustomProfileProps) {
  const { data: user } = useUser()

  return (
    <Dialog open={tab !== null} onOpenChange={onOpenChange}>
      <DialogContent className='flex p-0 m-0 h-183 w-6xl min-w-6xl'>
        {tab && (
          <Tabs
            key={tab}
            defaultValue={tab}
            orientation='vertical'
            className='w-full'
          >
            <div className='flex flex-col gap-4 w-62 py-4 px-3 border-r border-border bg-card'>
              <div className='flex items-center gap-2'>
                <Avatar>
                  <AvatarImage src={user?.image || ''} alt={user?.name} />
                  <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <H4 className='text-md'>{user?.name}</H4>
                  <Muted className='text-xs text-primary'>{user?.email}</Muted>
                </div>
              </div>
              <div className='flex flex-col gap-1.5'>
                <span className='p-2 pb-0 text-xs font-semibold text-muted-foreground'>
                  Seu perfil
                </span>
                <TabsList className='w-full flex flex-col gap-2 bg-transparent'>
                  <TabsTrigger
                    value='profile'
                    className='data-active:bg-secondary! data-active:text-secondary-foreground! data-active:hover:bg-secondary/80! border-none!'
                  >
                    <NexoIcon icon={UserCircleIcon} strokeWidth={2} />
                    Perfil
                  </TabsTrigger>
                  <TabsTrigger
                    value='preferences'
                    className='data-active:bg-secondary! data-active:text-secondary-foreground! data-active:hover:bg-secondary/80! border-none!'
                  >
                    <NexoIcon icon={PreferenceHorizontalIcon} strokeWidth={2} />
                    Preferências
                  </TabsTrigger>
                  <TabsTrigger
                    value='notifications'
                    className='data-active:bg-secondary! data-active:text-secondary-foreground! data-active:hover:bg-secondary/80! border-none!'
                  >
                    <NexoIcon icon={Notification01Icon} strokeWidth={2} />
                    Notificações
                  </TabsTrigger>
                  <TabsTrigger
                    value='security'
                    className='data-active:bg-secondary! data-active:text-secondary-foreground! data-active:hover:bg-secondary/80! border-none!'
                  >
                    <NexoIcon icon={SquareLock01Icon} strokeWidth={2} />
                    Segurança
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            <div className='flex-1 px-8 py-9 w-full'>
              <UserModalProfileTab tab='profile' />
              <UserModalPreferencesTab tab='preferences' />
              <UserModalNotificationsTab tab='notifications' />
              <UserModalSecurityTab tab='security' />
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
