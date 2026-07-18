export interface MemberImportRowResult {
  row: number
  email: string
  status: 'invited' | 'skipped' | 'error'
  reason?: string
}

export interface MemberImportResult {
  invited: number
  skipped: number
  errors: number
  rows: MemberImportRowResult[]
}
