import {
  Alert02Icon,
  EnergyEllipseIcon,
  EnergyRectangleIcon,
} from '@hugeicons-pro/core-bulk-rounded'

export const PROJECT_UPDATE_HEALTH = {
  ON_TRACK: {
    label: 'No caminho certo',
    icon: EnergyEllipseIcon,
    text: 'text-green-500',
  },
  AT_RISK: {
    label: 'Em risco',
    icon: EnergyRectangleIcon,
    text: 'text-yellow-500',
  },
  OFF_TRACK: {
    label: 'Fora do caminho',
    icon: Alert02Icon,
    text: 'text-red-500',
  },
} as const

export type ProjectUpdateHealth = keyof typeof PROJECT_UPDATE_HEALTH
