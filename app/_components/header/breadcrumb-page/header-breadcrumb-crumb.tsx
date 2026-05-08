import { BreadcrumbItem } from '@/components/ui/breadcrumb'

export function HeaderBreadcrumbCrumb({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <BreadcrumbItem className='font-semibold text-xs'>
      {children} {title}
    </BreadcrumbItem>
  )
}
