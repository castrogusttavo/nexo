import { validationError } from "@/src/errors"
import { err, ok, Result } from "@/src/lib/result"

interface ReadUploadOptions {
  invalidBody?: string
  invalidFile?: string
}

export async function readUploadFile(
  request: Request,
  field: string,
  options: ReadUploadOptions = {}
): Promise<Result<File>> {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return err(validationError(options.invalidBody ?? 'Corpo da requisição inválido'))
  }

  const file = formData.get(field)
  if (!(file instanceof File)) {
    return err(validationError(options.invalidFile ?? 'Arquivo inválido'))
  }

  return ok(file)
}
