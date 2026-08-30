'use client'

import * as React from 'react'
import { BLOCK_CONTEXT_MENU_ID, BlockMenuPlugin, BlockSelectionPlugin } from '@platejs/selection/react'
import { KEYS } from 'platejs'
import { useEditorPlugin, useEditorReadOnly, usePluginOption } from 'platejs/react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { setBlockType } from '@/components/editor/transforms'
import { useIsTouchDevice } from '@/components/hooks/use-is-touch-device'

export function BlockContextMenu({ children }: { children: React.ReactNode }) {
  const { api, editor } = useEditorPlugin(BlockMenuPlugin)
  const isTouch = useIsTouchDevice()
  const readOnly = useEditorReadOnly()
  const openId = usePluginOption(BlockMenuPlugin, 'openId')
  const isOpen = openId === BLOCK_CONTEXT_MENU_ID

  const handleTurnInto = React.useCallback(
    (type: string) => {
      editor.getApi(BlockSelectionPlugin).blockSelection.getNodes().forEach(([, path]) => {
        setBlockType(editor, type, { at: path })
      })
    },
    [editor]
  )

  const handleAlign = React.useCallback(
    (align: 'center' | 'left' | 'right') => {
      editor.getTransforms(BlockSelectionPlugin).blockSelection.setNodes({ align })
    },
    [editor]
  )

  if (isTouch) return children

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (!open) {
          api.blockMenu.hide()
          editor.getApi(BlockSelectionPlugin).blockSelection.focus()
        }
      }}
    >
      <ContextMenuTrigger
        render={<div className='w-full' />}
        onContextMenu={(event: React.MouseEvent<HTMLElement>) => {
          const dataset = (event.target as HTMLElement).dataset
          const disabled = dataset?.slateEditor === 'true' || readOnly || dataset?.plateOpenContextMenu === 'false'
          if (disabled) return event.preventDefault()
          setTimeout(() => {
            api.blockMenu.show(BLOCK_CONTEXT_MENU_ID, { x: event.clientX, y: event.clientY })
          }, 0)
        }}
      >
        {children}
      </ContextMenuTrigger>
      {isOpen && (
        <ContextMenuContent className='w-64'>
          <ContextMenuGroup>
            <ContextMenuItem
              onClick={() => {
                editor.getTransforms(BlockSelectionPlugin).blockSelection.removeNodes()
                editor.tf.focus()
              }}
            >
              Excluir
            </ContextMenuItem>
            <ContextMenuItem onClick={() => editor.getTransforms(BlockSelectionPlugin).blockSelection.duplicate()}>
              Duplicar
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>Transformar em</ContextMenuSubTrigger>
              <ContextMenuSubContent className='w-48'>
                <ContextMenuItem onClick={() => handleTurnInto(KEYS.p)}>Texto</ContextMenuItem>
                <ContextMenuItem onClick={() => handleTurnInto(KEYS.h1)}>Título 1</ContextMenuItem>
                <ContextMenuItem onClick={() => handleTurnInto(KEYS.h2)}>Título 2</ContextMenuItem>
                <ContextMenuItem onClick={() => handleTurnInto(KEYS.h3)}>Título 3</ContextMenuItem>
                <ContextMenuItem onClick={() => handleTurnInto(KEYS.blockquote)}>Citação</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuGroup>
          <ContextMenuGroup>
            <ContextMenuItem onClick={() => editor.getTransforms(BlockSelectionPlugin).blockSelection.setIndent(1)}>
              Aumentar recuo
            </ContextMenuItem>
            <ContextMenuItem onClick={() => editor.getTransforms(BlockSelectionPlugin).blockSelection.setIndent(-1)}>
              Diminuir recuo
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>Alinhar</ContextMenuSubTrigger>
              <ContextMenuSubContent className='w-48'>
                <ContextMenuItem onClick={() => handleAlign('left')}>Esquerda</ContextMenuItem>
                <ContextMenuItem onClick={() => handleAlign('center')}>Centro</ContextMenuItem>
                <ContextMenuItem onClick={() => handleAlign('right')}>Direita</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuGroup>
        </ContextMenuContent>
      )}
    </ContextMenu>
  )
}
