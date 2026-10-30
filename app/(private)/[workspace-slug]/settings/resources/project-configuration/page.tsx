import { FullScreenIcon } from '@hugeicons-pro/core-stroke-rounded'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Page() {
  return (
    <div className='w-full overflow-y-auto'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title={'Projetos'}>
            <NexoIcon
              icon={FullScreenIcon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
      </HeaderInternalNavigation>
      <div>
        <h4>Projetos</h4>
        <Muted>
          Os estados e as etiquetas definidos aqui se aplicam a todos os
          projetos deste workspace, para que todos sigam a mesma estrutura.
        </Muted>
        <Field>
          <Label>Permitir que membros criem projetos</Label>
          <p>
            Quando ativado, os membros podem criar novos projetos, não apenas
            administradores e proprietários.
          </p>
          <Switch />
        </Field>
        <Tabs>
          <TabsList>
            <TabsTrigger value='state-project'>Estados do projeto</TabsTrigger>
            <TabsTrigger value='label-project'>
              Etiquetas do projeto
            </TabsTrigger>
          </TabsList>
          <TabsContent value='state-project'>
            <Field>
              <Label>Ativar estados do projeto</Label>
              <p>
                Acompanhe o progresso de todos os seus projetos por qualquer
                propriedade do projeto.
              </p>
              <Switch />
            </Field>
            <div>
              <h5>Estados</h5>
              <Muted>
                Personalize os estados usados para acompanhar o progresso dos
                projetos deste workspace.
              </Muted>
            </div>
            <div>{/* Lista completa + not found */}</div>
          </TabsContent>
          <TabsContent value='label-project'>
            <h5>Etiquetas do projeto</h5>
            <Muted>
              As etiquetas ajudam você a agrupar e filtrar projetos neste
              workspace.
            </Muted>
            <Button>Adicionar etiqueta</Button>
            <div>{/* Lista completa + not found */}</div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
