export interface ChangelogEntryDTO {
	slug: string
	title: string
	date: string
	summary: string
	improvements: string[]
	fixes: string[]
	/** Sanitized HTML of the Markdown body; empty when the entry has no news. */
	contentHtml: string
	markdown: string
}