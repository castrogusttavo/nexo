import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface UpgradeWorkspace {
  id: string
  name: string
  activePlan: string
}

interface UpgradeWorkspaceSeatsCardProps {
  workspaces: UpgradeWorkspace[]
  workspaceId: string | null
  onWorkspaceChange: (id: string | null) => void
  seats: number
  onSeatsChange: (seats: number) => void
}

export function UpgradeWorkspaceSeatsCard({
  workspaces,
  workspaceId,
  onWorkspaceChange,
  seats,
  onSeatsChange,
}: UpgradeWorkspaceSeatsCardProps) {
  return (
    <div className='bg-muted w-full p-5 rounded-lg flex flex-col gap-7'>
      <Field orientation='horizontal' className='justify-between space-x-3'>
        <div className='flex flex-col gap-1.5'>
          <FieldLabel htmlFor='workspace'>
            Workspace <span className='text-destructive'>*</span>
          </FieldLabel>
          <FieldDescription>
            As atualizações em nuvem se aplicam a um espaço de trabalho na
            compra.
          </FieldDescription>
        </div>
        <Select
          items={workspaces.map((ws) => ({
            value: ws.id,
            label: ws.name,
          }))}
          value={workspaceId ?? undefined}
          onValueChange={onWorkspaceChange}
        >
          <SelectTrigger id='workspace' className='w-full max-w-60 h-9'>
            <SelectValue placeholder='Selecione um workspace' />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              {workspaces.map((ws) => (
                <SelectItem key={ws.id} value={ws.id}>
                  {ws.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field orientation='horizontal' className='justify-between space-x-3'>
        <div className='flex flex-col gap-1.5'>
          <FieldLabel htmlFor='seats'>Quantidade dos usuários</FieldLabel>
          <FieldDescription>
            Os usuários são baseados na contagem de membros do seu espaço de
            trabalho.
          </FieldDescription>
        </div>
        <Input
          id='seats'
          type='number'
          min={1}
          value={seats}
          onChange={(e) =>
            onSeatsChange(Math.max(1, Number(e.target.value) || 1))
          }
          className='w-14 border border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
        />
      </Field>
    </div>
  )
}
