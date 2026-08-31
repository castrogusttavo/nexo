import * as React from 'react'

interface WikiEditorContextValue {
  workspaceId: string
}

const WikiEditorContext = React.createContext<WikiEditorContextValue | null>(
  null,
)

export function WikiEditorProvider({
  workspaceId,
  children,
}: React.PropsWithChildren<{ workspaceId: string }>) {
  const value = React.useMemo(() => ({ workspaceId }), [workspaceId])
  return (
    <WikiEditorContext.Provider value={value}>
      {children}
    </WikiEditorContext.Provider>
  )
}

export function useWikiEditorContext(): WikiEditorContextValue {
  const ctx = React.useContext(WikiEditorContext)
  if (!ctx) {
    throw new Error(
      'useWikiEditorContext deve ser usado dentro de WikiEditorProvider',
    )
  }
  return ctx
}
