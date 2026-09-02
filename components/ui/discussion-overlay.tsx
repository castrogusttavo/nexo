'use client'

import * as React from 'react'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { CommentPlugin } from '@platejs/comment/react'
import { useEditorRef, usePluginOption } from 'platejs/react'
import { discussionPlugin } from '@/components/editor/plugins/discussion-plugin'
import { DiscussionThread } from './discussion-thread'

export function DiscussionOverlay() {
  const editor = useEditorRef()
  const activeId = usePluginOption(discussionPlugin, 'activeId')
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)
  const anchorRef = React.useRef<HTMLElement | null>(null)
  anchorRef.current = anchor

  React.useLayoutEffect(() => {
    if (!activeId) {
      setAnchor(null)
      return
    }
    // `at: []` searches the whole document — the default (current selection)
    // can be stale right after a click, since Slate syncs editor.selection
    // asynchronously relative to the click handler that sets activeId.
    const entry = editor
      .getApi(CommentPlugin)
      .comment.node({ id: activeId, at: [] })
    setAnchor(entry ? (editor.api.toDOMNode(entry[0]) ?? null) : null)
  }, [activeId, editor])

  const open = !!activeId && !!anchor

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) editor.setOption(discussionPlugin, 'activeId', null)
      }}
      modal={false}
    >
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          anchor={anchorRef}
          align='start'
          side='bottom'
          sideOffset={8}
          className='isolate z-50 outline-none'
        >
          <PopoverPrimitive.Popup
            initialFocus={false}
            contentEditable={false}
            className='z-50 w-80 origin-(--transform-origin) overflow-hidden rounded-md bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95'
          >
            {activeId && <DiscussionThread markId={activeId} />}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
