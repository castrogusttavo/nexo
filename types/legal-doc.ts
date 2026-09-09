export interface LegalDocMetaDTO {
  slug: string
  title: string
  date: string
  summary: string
}

export interface LegalDocDTO extends LegalDocMetaDTO {
  content: string
  contentHtml: string
}
