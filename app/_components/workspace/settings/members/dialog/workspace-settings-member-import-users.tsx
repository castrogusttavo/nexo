import { type ChangeEvent, useRef, useState } from 'react'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'
import { useImportMembers } from '@/src/hooks/use-member'

export function WorkspaceSettingsMemberImportDialog({
  workspaceId,
}: {
  workspaceId: string
}) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const importMembers = useImportMembers(workspaceId)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null)
  }

  function handleImport() {
    if (!file) return

    importMembers.mutate(file, {
      onSuccess: (result) => {
        const parts = [
          `${result.invited} convite${result.invited === 1 ? '' : 's'} enviado${result.invited === 1 ? '' : 's'}`,
        ]
        if (result.skipped) parts.push(`${result.skipped} ignorado(s)`)
        if (result.errors) parts.push(`${result.errors} com erro`)
        notify.success(parts.join(', '))
        setFile(null)
        if (inputRef.current) inputRef.current.value = ''
        setOpen(false)
      },
      onError: (error) =>
        notify.error(error, 'Não foi possível importar o CSV'),
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant='outline' size='sm' className='h-8' />}
      >
        Importar CSV
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar membros via CSV</DialogTitle>
          <DialogDescription>
            O arquivo deve conter as colunas <code>email</code>,{' '}
            <code>username</code>, <code>name</code> e <code>role</code>. Cada
            linha gera um convite por e-mail.
          </DialogDescription>
        </DialogHeader>
        <Input
          ref={inputRef}
          type='file'
          accept='.csv,text/csv'
          onChange={handleFileChange}
        />
        {file && <Muted>{file.name}</Muted>}
        <DialogFooter>
          <Button
            type='button'
            disabled={!file || importMembers.isPending}
            onClick={handleImport}
          >
            {importMembers.isPending ? 'Importando...' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
