import { Home09Icon } from '@hugeicons-pro/core-stroke-rounded'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import { NexoIcon } from '@/components/icon/icon'

export default async function Page() {
  return (
    <div>
      <HeaderBreadcrumbList>
        <HeaderBreadcrumbCrumb title={'Página inicial'}>
          <NexoIcon icon={Home09Icon} />
        </HeaderBreadcrumbCrumb>
      </HeaderBreadcrumbList>
      <h1>Welcome to Nexo</h1>
    </div>
  )
}
