'use client'

import { useEffect, useSyncExternalStore } from 'react'
import {
  CONTEXT_SIDEBAR_SECTIONS,
  type ContextSidebarSectionId,
  contextSidebarAttribute,
  contextSidebarStorageKey,
} from './context-sidebar-sections'

const listeners = new Set<() => void>()

const unsaved = new Map<ContextSidebarSectionId, boolean>()

function isOpen(section: ContextSidebarSectionId): boolean {
  const pending = unsaved.get(section)
  if (pending !== undefined) return pending
  try {
    return localStorage.getItem(contextSidebarStorageKey(section)) !== 'closed'
  } catch {
    return true
  }
}

// The <html> attribute is the whole state: CONTEXT_SIDEBAR_STYLE shows and
// hides from it, so React keeps no copy that could disagree with the CSS.
function reflect(section: ContextSidebarSectionId, open: boolean) {
  const attribute = contextSidebarAttribute(section)
  if (open) document.documentElement.removeAttribute(attribute)
  else document.documentElement.setAttribute(attribute, 'closed')
}

// A collapse in another tab arrives as a storage event; a null key means the
// storage was cleared, which reads as open.
function onStorage(event: StorageEvent) {
  for (const section of CONTEXT_SIDEBAR_SECTIONS) {
    if (event.key === null || event.key === contextSidebarStorageKey(section)) {
      reflect(section, event.newValue !== 'closed')
    }
  }
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener('storage', onStorage)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener('storage', onStorage)
  }
}

export function setContextSidebarOpen(
  section: ContextSidebarSectionId,
  open: boolean,
) {
  try {
    localStorage.setItem(
      contextSidebarStorageKey(section),
      open ? 'open' : 'closed',
    )
  } catch {
    // Storage refused (private mode, quota): this tab still follows the click.
  }
  reflect(section, open)
}

export function useContextSidebarSync() {
  useEffect(() => {
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
}

export function useContextSidebar(section: ContextSidebarSectionId | null) {
  const open = useSyncExternalStore(
    subscribe,
    () => (section ? isOpen(section) : true),
    () => true,
  )

  return {
    open,
    setOpen(next: boolean) {
      if (section) setContextSidebarOpen(section, next)
    },
  }
}
