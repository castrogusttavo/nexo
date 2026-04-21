import type { ComponentProps } from 'react'

interface TableProps extends ComponentProps<'table'> {
  children: React.ReactNode
}

export function Table({ children }: TableProps) {
  return (
    <div className='my-6 w-full overflow-y-auto'>
      <table className='w-full text-primary'>{children}</table>
    </div>
  )
}

export function TableHead({ children }: TableProps) {
  return <thead>{children}</thead>
}

export function TableBody({ children }: TableProps) {
  return <tbody>{children}</tbody>
}

export function TableRow({ children }: TableProps) {
  return <tr className='even:bg-muted m-0 border-t p-0'>{children}</tr>
}

export function TableData({ children }: TableProps) {
  return <td className='px-4 py-2'>{children}</td>
}

export function TableHeader({ children }: TableProps) {
  return (
    <th className='border px-4 py-2 text-left font-bold [[align=center]]:text-cente [[align=right]]:text-right'>
      {children}
    </th>
  )
}
