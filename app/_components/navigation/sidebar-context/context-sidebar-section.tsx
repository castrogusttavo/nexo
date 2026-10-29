'use client'

import { createContext, type ReactNode, useContext } from 'react'
import type { ContextSidebarSectionId } from './context-sidebar-sections'
import { useContextSidebarSync } from './use-context-sidebar'

const ContextSidebarSectionContext =
  createContext<ContextSidebarSectionId | null>(null)

export function ContextSidebarSection({
  id,
  children,
}: {
  id: ContextSidebarSectionId
  children: ReactNode
}) {
  useContextSidebarSync()

  return (
    <ContextSidebarSectionContext.Provider value={id}>
      {children}
    </ContextSidebarSectionContext.Provider>
  )
}

export function useContextSidebarSection() {
  return useContext(ContextSidebarSectionContext)
}
