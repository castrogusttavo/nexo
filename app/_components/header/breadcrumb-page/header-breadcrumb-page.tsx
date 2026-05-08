import { Breadcrumb, BreadcrumbList } from '@/components/ui/breadcrumb'

export function PageHeader({ children }: { children: React.ReactNode }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>{children}</BreadcrumbList>
    </Breadcrumb>
  )
}
