'use client'

import { mergeAttributes, Node, NodeViewContent, NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"
import { EDITOR_COLORS } from "./colors"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return { color: { default: 'gray' } }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView)
  }
})

function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const color = EDITOR_COLORS.find((c) => c.value === node.attrs.color) ?? EDITOR_COLORS[0]

  return (
    <NodeViewWrapper
      className='flex gap-2 rounded-md p-3'
      style={{ backgroundColor: color.background ?? undefined }}
    >
      <div contentEditable={false}>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                className='rounded-full border border-border'
                style={{ backgroundColor: color.background ?? 'transparent' }}
              />
            }
          />
          <PopoverContent className='flex w-40 flex-wrap gap-2 p-2' align='start'>
            {EDITOR_COLORS.map((c) => (
              <button
                key={c.value}
                type='button'
                title={c.label}
                onClick={() => updateAttributes({ color: c.value })}
                className='size-6 cursor-pointer rounded-full border border-border'
                style={{ backgroundColor: c.background ?? 'transparent' }}
              />
            ))}
          </PopoverContent>
        </Popover>
      </div>
      <NodeViewContent className="flex-1" />
    </NodeViewWrapper>
  )
}
