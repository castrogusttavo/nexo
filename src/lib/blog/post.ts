import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { cache } from 'react'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import { remark } from 'remark'
import remarkRehype from 'remark-rehype'
import { BlogPostFrontmatterSchema } from '@/src/schemas/blog-post.schema'
import type {
  BlogPostDTO,
  BlogPostHeading,
  BlogPostMetaDTO,
} from '@/types/blog-post'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')
const HEADING_REGEX = /<h([1-6]) id="([^"]+)">(.*?)<\/h\1>/g

async function readPostFile(fileName: string) {
  const raw = await fs.readFile(path.join(BLOG_DIR, fileName), 'utf-8')
  const { data, content } = matter(raw)
  return { frontmatter: BlogPostFrontmatterSchema.parse(data), content }
}

function toMeta(
  frontmatter: ReturnType<typeof BlogPostFrontmatterSchema.parse>,
): BlogPostMetaDTO {
  return {
    slug: frontmatter.slug,
    title: frontmatter.title,
    date: frontmatter.date.toISOString(),
    excerpt: frontmatter.excerpt,
    cover: frontmatter.cover ?? null,
    tag: frontmatter.tag,
  }
}

function extractHeadings(html: string): BlogPostHeading[] {
  return Array.from(html.matchAll(HEADING_REGEX), (match) => ({
    level: Number(match[1]) as BlogPostHeading['level'],
    id: match[2],
    text: match[3].replace(/<[^>]+>/g, '').trim(),
  }))
}
async function listMarkdownFiles() {
  try {
    const fileNames = await fs.readdir(BLOG_DIR)
    return fileNames.filter((name) => name.endsWith('.md'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

export const getAllPostsMeta = cache(async (): Promise<BlogPostMetaDTO[]> => {
  const fileNames = await listMarkdownFiles()
  const posts = await Promise.all(
    fileNames.map(async (fileName) => {
      const { frontmatter } = await readPostFile(fileName)
      return toMeta(frontmatter)
    }),
  )

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
})

export const getPostBySlug = cache(
  async (slug: string): Promise<BlogPostDTO | null> => {
    const fileNames = await listMarkdownFiles()

    for (const fileName of fileNames) {
      const { frontmatter, content } = await readPostFile(fileName)
      if (frontmatter.slug !== slug) continue

      const compiled = await remark()
        .use(remarkRehype)
        .use(rehypeSlug)
        .use(rehypeSanitize)
        .use(rehypeStringify)
        .process(content)
      const contentHtml = compiled.toString()

      return {
        ...toMeta(frontmatter),
        content,
        contentHtml,
        headings: extractHeadings(contentHtml),
      }
    }

    return null
  },
)
