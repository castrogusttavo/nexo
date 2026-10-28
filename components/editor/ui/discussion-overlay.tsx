'use client'

import * as React from 'react'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { CommentPlugin } from '@platejs/comment/react'
import { YjsPlugin } from '@platejs/yjs/react'
import { useQueryClient } from '@tanstack/react-query'
import { useEditorRef, usePluginOption } from 'platejs/react'
import { discussionPlugin } from '@/components/editor/plugins/discussion-plugin'
import { wikiCommentsKey } from '@/src/hooks/use-wiki-comment'
import { useWikiEditorContext } from '@/src/hooks/use-wiki-editor-context'
import { DiscussionThread } from './discussion-thread'

export function DiscussionOverlay() {
  const editor = useEditorRef()
  const { workspaceId, wikiPageId } = useWikiEditorContext()
  const queryClient = useQueryClient()
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

  // Broadcast: mutations elsewhere in this tree bump their own awareness
  // state's `wikiCommentsRev` field (see discussion-thread.tsx). Reusing the
  // same Yjs/Hocuspocus connection as the document avoids standing up a
  // separate realtime channel just for comments. Awareness also carries
  // cursor position for every keystroke, so this only reacts when a peer's
  // wikiCommentsRev actually moved forward, not on every awareness tick.
  const lastRevByClientRef = React.useRef<Map<number, number>>(new Map())

  React.useEffect(() => {
    const awareness = editor.getOption(YjsPlugin, 'awareness')
    if (!awareness) return

    function handleChange() {
      let changed = false
      awareness.getStates().forEach((state, clientId) => {
        const rev = state.wikiCommentsRev as number | undefined
        if (rev && rev !== lastRevByClientRef.current.get(clientId)) {
          lastRevByClientRef.current.set(clientId, rev)
          changed = true
        }
      })
      if (changed) {
        queryClient.invalidateQueries({
          queryKey: wikiCommentsKey(workspaceId, wikiPageId),
        })
      }
    }

    awareness.on('change', handleChange)
    return () => awareness.off('change', handleChange)
  }, [editor, queryClient, workspaceId, wikiPageId])

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
            className='z-50 w-[380px] max-w-[calc(100vw-24px)] origin-(--transform-origin) overflow-hidden rounded-md bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95'
          >
            {activeId && <DiscussionThread markId={activeId} />}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
