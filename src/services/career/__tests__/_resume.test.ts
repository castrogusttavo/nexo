import { describe, expect, it, vi } from 'vitest'

vi.mock('@/src/lib/storage/s3')

import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { ensureBucket, putObject } from '@/src/lib/storage/s3'
import { persistResume, validateResume } from '../_resume'

const mockedEnsureBucket = vi.mocked(ensureBucket)
const mockedPutObject = vi.mocked(putObject)

const validPdf = Buffer.from('%PDF-1.4 fake content')

describe('validateResume()', () => {
  it('accepts a valid PDF', () => {
    const result = validateResume('application/pdf', validPdf)
    expectOk(result)
  })

  it('rejects a non-PDF content type', () => {
    const result = validateResume('image/png', validPdf)
    expectErr(result, 'VALIDATION_ERROR')
  })

  it('rejects a file larger than 10MB', () => {
    const big = Buffer.concat([
      Buffer.from('%PDF-'),
      Buffer.alloc(10 * 1024 * 1024),
    ])
    const result = validateResume('application/pdf', big)
    expectErr(result, 'VALIDATION_ERROR')
  })

  it('rejects a file with the wrong magic number', () => {
    const fake = Buffer.from('not-a-real-pdf')
    const result = validateResume('application/pdf', fake)
    expectErr(result, 'VALIDATION_ERROR')
  })
})

describe('persistResume()', () => {
  it('uploads the file and resolves ok', async () => {
    mockedEnsureBucket.mockResolvedValue(undefined)
    mockedPutObject.mockResolvedValue(undefined)

    const result = await persistResume({ key: 'job-1/abc.pdf', body: validPdf })

    expectOk(result)
    expect(mockedPutObject).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'career-applications',
        key: 'job-1/abc.pdf',
        contentType: 'application/pdf',
      }),
    )
  })

  it('returns STORAGE_ERROR when the upload fails', async () => {
    mockedEnsureBucket.mockResolvedValue(undefined)
    mockedPutObject.mockRejectedValue(new Error('minio down'))

    const result = await persistResume({ key: 'job-1/abc.pdf', body: validPdf })

    expectErr(result, 'STORAGE_ERROR')
  })
})
