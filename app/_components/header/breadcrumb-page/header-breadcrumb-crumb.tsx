import { BreadcrumbItem } from '@/components/ui/breadcrumb'

export function Crumb({ children }: { children: React.ReactNode }) {
  return <BreadcrumbItem>{children}</BreadcrumbItem>
}
