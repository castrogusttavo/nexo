import { notify } from "./notify"

// navigator.clipboard rejects ouside a secure context, without premission or
// when the document is not focused; callers get feedback either way.
export async function copyToClipboard(
  text: string,
  successMessage = 'Copiado'
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    notify.success(successMessage)
    return true
  } catch {
    notify.error('Não foi possível copiar')
    return false
  }
}
