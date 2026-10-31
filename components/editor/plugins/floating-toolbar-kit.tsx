'use client'

import { createPlatePlugin } from 'platejs/react'
import { FloatingToolbar } from '@/components/editor/ui/floating-toolbar'
import { FloatingToolbarButtons } from '@/components/editor/ui/floating-toolbar-buttons'

const floatingToolbarPlugin = (comments: boolean) =>
  createPlatePlugin({
    key: 'floating-toolbar',
    render: {
      afterEditable: () => (
        <FloatingToolbar>
          <FloatingToolbarButtons comments={comments} />
        </FloatingToolbar>
      ),
    },
  })

export const FloatingToolbarKit = [floatingToolbarPlugin(true)]
// For editors that have no comment plugin.
export const FloatingToolbarNoCommentsKit = [floatingToolbarPlugin(false)]