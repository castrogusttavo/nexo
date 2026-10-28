import {
  PreferenceHorizontalIcon,
  Settings01Icon,
} from '@hugeicons-pro/core-stroke-rounded'

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
