import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { MINIO_ENDPOINT, MINIO_PASSWORD, MINIO_USER } from '@/lib/env/server'
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

export async function POST(request: Request) {
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

    return successResponse({ filename, content: saved })
  } catch (err) {
    console.error('Storage error:', err)
    return standardError('INTERNAL_SERVER_ERROR', 'Failed to upload file')
  }
}
