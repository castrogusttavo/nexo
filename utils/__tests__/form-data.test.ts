import { describe, expect, it } from "vitest"
import { readUploadFile } from "../form-data"
import { expectErr, expectOk } from "@/src/__tests__/helpers/result.helpers"

function requestWithFormData(formData: FormData): Request {
  return new Request('http://localhost/upload', {
    method: 'POST',
    body: formData
  })
}

describe('readUploadFile()', () => {
  it('should return the file when the field holds a valid File', async () => {
    const file = new File(['hello'], 'avatar.png', { type: 'image/png' })
    const formData = new FormData()
    formData.append('file', file)

    const result = await readUploadFile(requestWithFormData(formData), 'file')

    const value = expectOk(result)
    expect(value).toBeInstanceOf(File)
    expect(value.name).toBe('avatar.png')
  })

  it('should return VALIDATION_ERROR with the default message when the body is not parseable', async () => {
    const request = {
      formData: async () => {
        throw new Error('boom')
      }
    } as unknown as Request

    const result = await readUploadFile(request, 'file')

    const error = expectErr(result, 'VALIDATION_ERROR')
    expect(error.message).toBe('Corpo da requisição inválido')
  })

  it('should honor a custom invalidBody message when parsing fails', async () => {
    const request = {
      formData: async () => {
        throw new Error('boom')
      }
    } as unknown as Request

    const result = await readUploadFile(request, 'file', {
      invalidBody: 'Multipart inválido'
    })

    const error = expectErr(result, 'VALIDATION_ERROR')
    expect(error.message).toBe('Multipart inválido')
  })

  it('should return VALIDATION_ERROR with the default message when the field is missing', async () => {
    const result = await readUploadFile(
      requestWithFormData(new FormData()),
      'file'
    )

    const error = expectErr(result, 'VALIDATION_ERROR')
    expect(error.message).toBe('Arquivo inválido')
  })

  it('should honor a custom invalidFile when the field is not a File', async () => {
    const formData = new FormData()
    formData.append('file', 'just-a-string')

    const result = await readUploadFile(requestWithFormData(formData), 'file', {
      invalidFile: 'Envie um arquivo de imagem'
    })

    const error = expectErr(result, 'VALIDATION_ERROR')
    expect(error.message).toBe('Envie um arquivo de imagem')
  })
})
