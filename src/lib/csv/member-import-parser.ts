import Papa from 'papaparse'
import {
  memberImportEmpty,
  memberImportInvalidFormat,
  validationError,
} from '@/src/errors'
import {
  MemberImportRequiredColumns,
  type MemberImportRowDTO,
  MemberImportRowSchema,
} from '@/src/schemas/member-import.schema'
import { err, ok, type Result } from '../result'

export async function parseMemberImportCsv(
  file: File,
): Promise<Result<MemberImportRowDTO[]>> {
  const text = await file.text()

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase(),
  })

  if (parsed.errors.length > 0) return err(memberImportInvalidFormat())

  const headers = parsed.meta.fields ?? []
  const missing = MemberImportRequiredColumns.filter(
    (column) => !headers.includes(column),
  )
  if (missing.length > 0) {
    return err(
      memberImportInvalidFormat(
        `Colunas obrigatórias ausentes: ${missing.join(',')}`,
      ),
    )
  }

  if (parsed.data.length === 0) return err(memberImportEmpty())

  const rows: MemberImportRowDTO[] = []
  for (const [index, raw] of parsed.data.entries()) {
    const result = MemberImportRowSchema.safeParse(raw)
    if (!result.success) {
      return err(
        validationError(
          `Linha ${index + 2} inválida: ${result.error.issues[0]?.message}`,
        ),
      )
    }
    rows.push(result.data)
  }

  return ok(rows)
}
