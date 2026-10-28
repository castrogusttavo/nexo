import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'

export function IssueExportDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size='sm' className='h-8'>
            Adicionar issue
          </Button>
        }
      />
    </Dialog>
  )
}
