'use client'

import { useParams } from 'next/navigation'
import type { ComponentProps } from 'react'
import { ButtonLink } from '@/components/button-link'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { IconStack } from '@/components/ui/icon-stack'

// Stands where a property would be when its workspace switch is off. The
// switches live on the project configuration page, so "Habilitar" goes there.
export function ProjectDisabledField({
  icon,
  title,
  description,
}: {
  icon: ComponentProps<typeof NexoIcon>['icon']
  title: string
  description: string
}) {
  const { 'workspace-slug': workspaceSlug } = useParams<{
    'workspace-slug': string
  }>()

  return (
    <div className='w-full max-w-100 mx-auto px-10 rounded-lg py-6 flex flex-col items-center justify-center gap-3 text-center'>
      <IconStack className='flex items-center justify-center size-8 h-22 w-20'>
        <NexoIcon icon={icon} strokeWidth={2} className='size-5' />
      </IconStack>
      <div className='space-y-1'>
        <p className='text-base font-semibold'>{title}</p>
        <Muted className='text-sm'>{description}</Muted>
      </div>
      <ButtonLink
        href={`/${workspaceSlug}/settings/resources/project-configuration`}
        size='sm'
        className='mt-6'
      >
        Habilitar
      </ButtonLink>
    </div>
  )
}
