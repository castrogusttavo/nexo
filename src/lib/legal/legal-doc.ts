import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { cache } from 'react'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import { remark } from 'remark'
import remarkRehype from 'remark-rehype'
import { LegalDocFrontmatterSchema } from '@/src/schemas/legal-doc.schema'
import type { LegalDocDTO, LegalDocMetaDTO } from '@/types/legal-doc'

const LEGALS_DIR = path.join(process.cwd(), 'content', 'legals')

async function readDocFile(fileName: string) {
  const raw = await fs.readFile(path.join(LEGALS_DIR, fileName), 'utf-8')
  const { data, content } = matter(raw)
  return { frontmatter: LegalDocFrontmatterSchema.parse(data), content }
}

function toMeta(
  frontmatter: ReturnType<typeof LegalDocFrontmatterSchema.parse>,
): LegalDocMetaDTO {
  return {
    slug: frontmatter.slug,
    title: frontmatter.title,
    date: frontmatter.date.toISOString(),
    summary: frontmatter.summary,
  }
}

async function listMarkdownFiles() {
  try {
    const fileNames = await fs.readdir(LEGALS_DIR)
    return fileNames.filter((name) => name.endsWith('.md'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

export const getAllLegalDocsMeta = cache(
  async (): Promise<LegalDocMetaDTO[]> => {
    const fileNames = await listMarkdownFiles()
    const docs = await Promise.all(
      fileNames.map(async (fileName) => {
        const { frontmatter } = await readDocFile(fileName)
        return toMeta(frontmatter)
      }),
    )

    return docs.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
  },
)

export const getLegalDocBySlug = cache(
  async (slug: string): Promise<LegalDocDTO | null> => {
    const fileNames = await listMarkdownFiles()

    for (const fileName of fileNames) {
      const { frontmatter, content } = await readDocFile(fileName)
      if (frontmatter.slug !== slug) continue

      const compiled = await remark()
        .use(remarkRehype)
        .use(rehypeSlug)
        .use(rehypeSanitize)
        .use(rehypeStringify)
        .process(content)

      return {
        ...toMeta(frontmatter),
        content,
        contentHtml: compiled.toString(),
      }
    }

    return null
  },
)
