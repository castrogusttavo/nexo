import { describe, expect, it } from 'vitest'
import { attachmentContentDisposition } from '../storage/s3'

describe('attachmentContentDisposition', () => {
  it('asks for a download under the given name', () => {
    expect(attachmentContentDisposition('plano.pdf')).toBe(
      `attachment; filename="plano.pdf"; filename*=UTF-8''plano.pdf`,
    )
  })

  it('keeps accents and spaces in the RFC 5987 name, with an ASCII fallback', () => {
    const header = attachmentContentDisposition('relatório final.pdf')

    expect(header).toContain('filename="relat_rio final.pdf"')
    expect(header).toContain("filename*=UTF-8''relat%C3%B3rio%20final.pdf")
  })

  it('cannot be used to inject header parameters', () => {
    const header = attachmentContentDisposition(
      'a"; filename="evil.exe\r\nX: 1',
    )

    // The quote and the line break never reach the header unescaped.
    expect(header).not.toMatch(/[\r\n]/)
    expect(header.match(/"/g)).toHaveLength(2)
    expect(header).toContain('filename="a_; filename=_evil.exe__X: 1"')
  })

  it('escapes the characters encodeURIComponent leaves alone', () => {
    expect(attachmentContentDisposition("a'b(c)*.txt")).toContain(
      "filename*=UTF-8''a%27b%28c%29%2A.txt",
    )
  })
})
