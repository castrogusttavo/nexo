import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { cacheLife } from 'next/cache'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { remark } from 'remark'
import remarkRehype from 'remark-rehype'
import type { ChangelogEntryDTO } from '@/types/changelog-entry'
import {
  type ChangelogEntryFrontmatter,
  ChangelogEntryFrontmatterSchema,
} from '../schemas/changelog-entry.schema'

const CHANGELOG_DIR = path.join(process.cwd(), 'content', 'changelog')

async function listEntryFiles() {
  try {
    const fileNames = await fs.readdir(CHANGELOG_DIR)
    return fileNames.filter((name) => name.endsWith('.md'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

function shiftHeadings(html: string, by: number) {
  if (by === 0) return html
  return html.replace(
    /<(\/?)h([1-5])\b/g,
    (_match, close: string, level: string) =>
      `<${close}h${Math.min(Number(level) + by, 6)}`,
  )
}

function toMarkdown(
  frontmatter: ChangelogEntryFrontmatter,
  body: string,
): string {
  const list = (title: string, items: string[]) =>
    items.length > 0
      ? [`## ${title}`, ...items.map((item) => `- ${item}`)].join('\n')
      : ''

  return [
    `# ${frontmatter.title}`,
    body.trim(),
    list('Melhorias', frontmatter.improvements),
    list('Correções', frontmatter.fixes),
  ]
    .filter(Boolean)
    .join('\n\n')
}

async function readEntry(
  fileName: string,
  headingShift: number,
): Promise<ChangelogEntryDTO> {
  const raw = await fs.readFile(path.join(CHANGELOG_DIR, fileName), 'utf-8')
  const { data, content } = matter(raw)
  const frontmatter = ChangelogEntryFrontmatterSchema.parse(data)

  const compiled = await remark()
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(content)

  return {
    slug: frontmatter.slug,
    title: frontmatter.title,
    date: frontmatter.date.toISOString(),
    summary: frontmatter.summary,
    improvements: frontmatter.improvements,
    fixes: frontmatter.fixes,
    contentHtml: shiftHeadings(compiled.toString().trim(), headingShift),
    markdown: toMarkdown(frontmatter, content),
  }
}

export const CHANGELOG_PAGE_SIZE = 5

export async function getChangelogPageCount(): Promise<number> {
  const entries = await getAllChangelogEntries()
  return Math.max(1, Math.ceil(entries.length / CHANGELOG_PAGE_SIZE))
}

export async function getChangelogPage(page: number) {
  const entries = await getAllChangelogEntries()
  const totalPages = Math.max(
    1,
    Math.ceil(entries.length / CHANGELOG_PAGE_SIZE),
  )

  if (!Number.isInteger(page) || page < 1 || page > totalPages) return null

  const start = (page - 1) * CHANGELOG_PAGE_SIZE
  return {
    entries: entries.slice(start, start + CHANGELOG_PAGE_SIZE),
    page,
    totalPages,
  }
}

export async function getRecentChangelogEntries(
  excludeSlug: string,
  limit = 3,
): Promise<ChangelogEntryDTO[]> {
  const entries = await getAllChangelogEntries()
  return entries.filter((entry) => entry.slug !== excludeSlug).slice(0, limit)
}

export async function getAllChangelogEntries(): Promise<ChangelogEntryDTO[]> {
  'use cache'
  cacheLife('max')

  const fileNames = await listEntryFiles()
  const entries = await Promise.all(
    fileNames.map((fileName) => readEntry(fileName, 1)),
  )

  return entries.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export async function getChangelogEntry(
  slug: string,
): Promise<ChangelogEntryDTO | null> {
  'use cache'
  cacheLife('max')

  for (const fileName of await listEntryFiles()) {
    const entry = await readEntry(fileName, 0)
    if (entry.slug === slug) return entry
  }

  return null
}
