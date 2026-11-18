import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { MINIO_ENDPOINT, MINIO_PASSWORD, MINIO_USER } from '@/lib/env/server'

let client: S3Client | null = null

export function getS3Client(): S3Client {
  if (!client) {
    client = new S3Client({
      endpoint: MINIO_ENDPOINT,
      region: 'us-east-1',
      credentials: {
        accessKeyId: MINIO_USER,
        secretAccessKey: MINIO_PASSWORD,
      },
      forcePathStyle: true,
    })
  }
  return client
}

export async function ensureBucket(bucket: string): Promise<void> {
  const s3 = getS3Client()
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }))
  }
}

export async function ensurePublicBucket(bucket: string): Promise<void> {
  const s3 = getS3Client()
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }))
  }
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      }),
    }),
  )
}

export interface PutObjectInput {
  bucket: string
  key: string
  body: string | Uint8Array | Buffer
  contentType: string
}

export async function putObject(input: PutObjectInput): Promise<void> {
  const s3 = getS3Client()
  await s3.send(
    new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  )
}

export interface PresignedDownloadInput {
  bucket: string
  key: string
  expiresInSeconds: number
  /**
   * Makes the browser save the file under this name instead of showing it.
   * The `download` attribute of an <a> is ignored across origins, so the
   * signed URL itself has to ask for `Content-Disposition: attachment`.
   */
  downloadFileName?: string
}

// RFC 6266: a quoted ASCII fallback plus the exact name as RFC 5987
// `filename*`, so accents and spaces survive and header injection (quotes,
// CR/LF) cannot.
export function attachmentContentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, '_')
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

export async function getPresignedDownloadUrl(
  input: PresignedDownloadInput,
): Promise<string> {
  const s3 = getS3Client()
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      ...(input.downloadFileName && {
        ResponseContentDisposition: attachmentContentDisposition(
          input.downloadFileName,
        ),
      }),
    }),
    { expiresIn: input.expiresInSeconds },
  )
}

export async function deleteObject(input: {
  bucket: string
  key: string
}): Promise<void> {
  const s3 = getS3Client()
  await s3.send(
    new DeleteObjectCommand({ Bucket: input.bucket, Key: input.key }),
  )
}

export async function getObjectBuffer(input: {
  bucket: string
  key: string
}): Promise<{ body: Buffer; contentType: string | undefined } | null> {
  const s3 = getS3Client()
  try {
    const response = await s3.send(
      new GetObjectCommand({ Bucket: input.bucket, Key: input.key }),
    )
    if (!response.Body) return null
    const bytes = await response.Body?.transformToByteArray()
    return { body: Buffer.from(bytes), contentType: response.ContentType }
  } catch {
    return null
  }
}
