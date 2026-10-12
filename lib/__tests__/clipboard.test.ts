import { expect, it } from "vitest";
import { afterEach, describe, vi } from "vitest";
import { copyToClipboard } from "../clipboard";
import { toast } from "sonner";

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}))

function stubClipboard(writeText: (text: string) => Promise<void>) {
  const spy = vi.fn(writeText)
  vi.stubGlobal('navigator', { clipboard: { writeText: spy } })
  return spy
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('copyToClipboard', () => {
  it('writes the text and confirms it', async () => {
    const writeText = stubClipboard(async () => { })

    await expect(
      copyToClipboard('https://nexo.app/acme', 'Link copiado')
    ).resolves.toBe(true)

    expect(writeText).toHaveBeenCalledExactlyOnceWith('https://nexo.app/acme')
    expect(toast.success).toHaveBeenCalledWith('Link copiado')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('falls back toa generic confirmation', async () => {
    stubClipboard(async () => { })

    await copyToClipboard('ALP-12')

    expect(toast.success).toHaveBeenCalledWith('Copiado')
  })

  it('reports a rejected write instead of throwing', async () => {
    stubClipboard(async () => {
      throw new DOMException('Document is not focused', 'NotAllowedError')
    })

    await expect(copyToClipboard('ALP-12')).resolves.toBe(false)

    expect(toast.error).toHaveBeenCalledWith('Não foi possível copiar')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('reports a missing clipboard API (insecure context)', async () => {
    vi.stubGlobal('navigator', { })

    await expect(copyToClipboard('ALP-12')).resolves.toBe(false)

    expect(toast.error).toHaveBeenCalledWith('Não foi possível copiar')
  })
})
