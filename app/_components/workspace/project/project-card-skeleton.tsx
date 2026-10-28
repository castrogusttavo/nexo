import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function ProjectCardSkeleton() {
  return (
    <Card className='p-0 gap-0 animate-pulse'>
      <CardHeader className='relative h-30 w-full rounded-t p-0 bg-muted' />
      <CardContent className='h-28 flex flex-col justify-between p-4 gap-3'>
        <div className='space-y-2'>
          <div className='h-3 w-3/4 rounded bg-muted' />
          <div className='h-3 w-1/2 rounded bg-muted' />
        </div>
        <div className='h-6 w-16 rounded bg-muted' />
      </CardContent>
    </Card>
  )
}
