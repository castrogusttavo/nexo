// What an attachment may be, shared by the server (validateAttachment) and the
// file picker, so the browser rejects a file before the upload and the two can
// never drift apart. No server imports here: client components use it too.

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024 // 25MB

export const ALLOWED_ATTACHMENT_TYPES: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'application/zip',
  'text/plain',
  'text/csv',
])

/** Value for `<input type="file" accept>`. */
export const ATTACHMENT_ACCEPT = [...ALLOWED_ATTACHMENT_TYPES].join(',')
