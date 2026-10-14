import type { ComponentProps } from 'react'

// Brand marks from Simple Icons (CC0). Inlined so the app doesn't load
// @icons-pack/react-simple-icons, whose barrel pulls ~3.4k .d.ts files into tsc.
type BrandIconProps = Omit<ComponentProps<'svg'>, 'children'> & {
  size?: number
  title: string
}

function BrandIcon({
  size = 24,
  title,
  path,
  ...rest
}: BrandIconProps & { path: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='currentColor'
      role='img'
      {...rest}
    >
      <title>{title}</title>
      <path d={path} />
    </svg>
  )
}

type Props = Omit<BrandIconProps, 'title'> & { title?: string }

export function AsanaIcon({ title = 'Asana', ...rest }: Props) {
  return (
    <BrandIcon
      title={title}
      path='M18.78 12.653c-2.882 0-5.22 2.336-5.22 5.22s2.338 5.22 5.22 5.22 5.22-2.34 5.22-5.22-2.336-5.22-5.22-5.22zm-13.56 0c-2.88 0-5.22 2.337-5.22 5.22s2.338 5.22 5.22 5.22 5.22-2.338 5.22-5.22-2.336-5.22-5.22-5.22zm12-6.525c0 2.883-2.337 5.22-5.22 5.22-2.882 0-5.22-2.337-5.22-5.22 0-2.88 2.338-5.22 5.22-5.22 2.883 0 5.22 2.34 5.22 5.22z'
      {...rest}
    />
  )
}

export function ClickUpIcon({ title = 'ClickUp', ...rest }: Props) {
  return (
    <BrandIcon
      title={title}
      path='M2 18.439l3.69-2.828c1.961 2.56 4.044 3.739 6.363 3.739 2.307 0 4.33-1.166 6.203-3.704L22 18.405C19.298 22.065 15.941 24 12.053 24 8.178 24 4.788 22.078 2 18.439zM12.04 6.15l-6.568 5.66-3.036-3.52L12.055 0l9.543 8.296-3.05 3.509z'
      {...rest}
    />
  )
}

export function JiraIcon({ title = 'Jira', ...rest }: Props) {
  return (
    <BrandIcon
      title={title}
      path='M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z'
      {...rest}
    />
  )
}

export function LinearIcon({ title = 'Linear', ...rest }: Props) {
  return (
    <BrandIcon
      title={title}
      path='M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z'
      {...rest}
    />
  )
}
