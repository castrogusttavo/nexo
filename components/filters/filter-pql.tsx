'use client'

import { useEffect, useMemo, useRef, useState } from "react"
import { useIssueFilters } from "./use-issue-filters"
import { parsePql, PqlSyntaxError } from "./pql-parser"
import { PqlLexError } from "./pql-lexer"
import { Textarea } from "../ui/textarea"

const WRITE_DELAY_MS = 250

export function FilterPql() {
  const [{ pql }, setFilters] = useIssueFilters()
  // The textarea edits a local draft that reaches the URL once typing
  // pauses: bound to the URL state directly it dropped keystrokes (the state
  // settles asynchronously) and every key was a URL write.
  const [draft, setDraft] = useState(pql)
  const lastWritten = useRef(pql)

  useEffect(() => {
    // Changed from outside (cleared, back/forward): follow the URL.
    if (pql === lastWritten.current) return
    lastWritten.current = pql
    setDraft(pql)
  }, [pql])

  useEffect(() => {
    if (draft === lastWritten.current) return
    const timer = setTimeout(() => {
      lastWritten.current = draft
      setFilters({ pql: draft })
    }, WRITE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [draft, setFilters])

  // Closing the panel mid-pause must not lose the last edit.
  const flush = useRef(() => {})
  flush.current = () => {
    if (draft !== lastWritten.current) setFilters({ pql: draft })
  }
  useEffect(() => () => flush.current(), [])

  const error = useMemo(() => {
    if (!draft.trim()) return null
    try {
      parsePql(draft)
      return null
    } catch (e) {
      if (e instanceof PqlSyntaxError || e instanceof PqlLexError) {
        return e.message
      }
      return 'Erro ao interpretar a consulta.'
    }
  }, [draft])

  return (
    <div className="flex flex-col gap-1">
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder='state = Todo priority IN (HIGH, URGENT) order-by created-at limit 10'
        className="font-mono text-sm"
        rows={3}
        aria-label='Consulta PQL'
        aria-invalid={!!error}
      />
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </div>
  )
}
