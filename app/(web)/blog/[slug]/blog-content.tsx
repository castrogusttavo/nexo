'use client'

import type { MouseEvent } from 'react'
import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface BlogContentProps {
  html: string
}

export function BlogContent({ html }: BlogContentProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLImageElement) {
      setLightboxSrc(event.target.currentSrc || event.target.src)
    }
  }

  return (
    <>
      <div
        onClick={handleClick}
        className='blog-content prose prose-neutral dark:prose-invert max-w-none w-full prose-headings:scroll-mt-24 prose-headings:font-medium prose-a:text-branding-500 prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl prose-img:cursor-zoom-in prose-pre:rounded-xl prose-pre:bg-muted prose-blockquote:border-branding-500 prose-blockquote:not-italic'
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <Dialog
        open={lightboxSrc !== null}
        onOpenChange={(open) => !open && setLightboxSrc(null)}
      >
        <DialogContent
          showCloseButton
          className='top-0 left-0 right-0 bottom-0 translate-x-0 translate-y-0 w-screen min-w-screen max-w-336 h-screen max-h-none rounded-none bg-transparent p-0 ring-0 flex items-center justify-center'
        >
          {lightboxSrc && (
            <img
              src={lightboxSrc}
              alt=''
              className='max-h-full max-w-336 rounded-lg object-contain'
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
