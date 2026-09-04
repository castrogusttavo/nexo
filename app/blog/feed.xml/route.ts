import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { getAllPostsMeta } from '@/src/lib/blog/post'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const posts = await getAllPostsMeta()

  const items = posts
    .map((post) => {
      const url = `${NEXT_PUBLIC_URL}/blog/${post.slug}`
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
    </item>`
    })
    .join('')

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog do Nexo</title>
    <link>${NEXT_PUBLIC_URL}/blog</link>
    <description>Novidades, bastidores e aprendizados do Nexo.</description>
    <language>pt-BR</language>
    <atom:link href="${NEXT_PUBLIC_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`

  return new Response(body, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
