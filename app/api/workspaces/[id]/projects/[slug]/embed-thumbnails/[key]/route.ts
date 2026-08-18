import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getObjectBuffer } from '@/src/lib/storage/s3'
import { ISSUE_EMBED_THUMBNAILS_BUCKET } from '@/src/services/_embed-thumbnail'

type Params = { params: Promise<{ key: string }> }

export const GET = withAxiom(async (_request: NextRequest, ctx: Params) => {
  const { key } = await ctx.params
  const object = await getObjectBuffer({
    bucket: ISSUE_EMBED_THUMBNAILS_BUCKET,
    key,
  })
  if (!object) return new Response(null, { status: 404 })

  return new Response(new Uint8Array(object.body), {
    headers: {
      'Content-Type': object.contentType ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
})
