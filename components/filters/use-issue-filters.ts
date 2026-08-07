import { parseAsJson, parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import { BasicFilterClausesSchema } from "./filter-schema";

export function useIssueFilters() {
  return useQueryStates({
    mode: parseAsStringEnum(['basic', 'pql']).withDefault('basic'),
    filters: parseAsJson(BasicFilterClausesSchema.parse).withDefault([]),
    pql: parseAsString.withDefault('')
  })
}
