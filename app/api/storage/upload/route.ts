import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { auditMutation } from '@/lib/axiom/audit'
import { withAxiom } from '@/lib/axiom/server'
import { MINIO_ENDPOINT, MINIO_PASSWORD, MINIO_USER } from '@/lib/env/server'
import { apiLimiter } from '@/src/lib/rate-limit'
import { getClientIp, withRateLimit } from '@/src/lib/rate-limit-helpers'
import { standardError, successResponse } from '@/utils/http-response'

const BUCKET = 'test-docs'

const s3 = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: MINIO_USER,
    secretAccessKey: MINIO_PASSWORD,
  },
  forcePathStyle: true,
})

async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }))
  }
}

export const POST = withAxiom(
  withRateLimit(
    (request) => ({ limiter: apiLimiter, key: `ip:${getClientIp(request)}` }),
    async (request: Request) => {
      try {
        const { content, filename } = await request.json()

        if (!content || !filename) {
          return standardError(
            'VALIDATION_ERROR',
            'content and filename are required',
          )
        }

        await ensureBucket()

        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: filename,
            Body: content,
            ContentType: 'text/markdown',
          }),
        )

        const response = await s3.send(
          new GetObjectCommand({ Bucket: BUCKET, Key: filename }),
        )
        const saved = await response.Body?.transformToString()

        auditMutation({
          entity: 'storage_object',
          action: 'upload',
          actorId: null,
          targetId: filename,
          meta: { bucket: BUCKET },
        })

        return successResponse({ filename, content: saved })
      } catch (err) {
        auditMutation({
          entity: 'storage_object',
          action: 'upload',
          actorId: null,
          outcome: 'failure',
          reason: err instanceof Error ? err.message : String(err),
          meta: { bucket: BUCKET },
        })
        return standardError('INTERNAL_SERVER_ERROR', 'Failed to upload file')
      }
    },
  ),
)
