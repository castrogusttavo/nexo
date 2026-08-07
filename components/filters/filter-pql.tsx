'use client'

import { useMemo } from "react"
import { useIssueFilters } from "./use-issue-filters"
import { parsePql, PqlSyntaxError } from "./pql-parser"
import { Textarea } from "../ui/textarea"

export function FilterPql() {
  const [{ pql }, setFilters] = useIssueFilters()

  const error = useMemo(() => {
    if (!pql.trim()) return null
    try {
      parsePql(pql)
      return null
    } catch (e) {
      if (e instanceof PqlSyntaxError) {
        return e.message
      }
      return 'Erro ao interpretar a consulta.'
    }
  }, [pql])

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setFilters({ pql: event.target.value })
  }

  return (
    <div className="flex flex-col gap-1">
      <Textarea
        value={pql}
        onChange={handleChange}
        placeholder='state = Todo priority IN (HIGH, URGENT) order-by created-at limit 10'
        className="font-mono text-sm"
        rows={3}
        aria-invalid={!!error}
      />
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </div>
  )
}
