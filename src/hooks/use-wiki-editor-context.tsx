import * as React from 'react'

interface WikiEditorContextValue {
  workspaceId: string
  wikiPageId: string
  userId: string
  userName: string
}

const WikiEditorContext = React.createContext<WikiEditorContextValue | null>(
  null,
)

export function WikiEditorProvider({
  workspaceId,
  wikiPageId,
  userId,
  userName,
  children,
}: React.PropsWithChildren<WikiEditorContextValue>) {
  const value = React.useMemo(
    () => ({ workspaceId, wikiPageId, userId, userName }),
    [workspaceId, wikiPageId, userId, userName],
  )
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
