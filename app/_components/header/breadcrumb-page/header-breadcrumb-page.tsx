import { Breadcrumb, BreadcrumbList } from '@/components/ui/breadcrumb'

export function HeaderBreadcrumbList({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>{children}</BreadcrumbList>
    </Breadcrumb>
  )
}
