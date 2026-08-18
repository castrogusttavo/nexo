import { SlashCommandItem } from "./slash-command"
import { Video01Icon, Image01Icon } from "@hugeicons-pro/core-stroke-rounded"

const ALLOWED_IMAGE_TYPES = 'image/png, image/jpeg, image/gif, image/webp, image/svg+xml'
const ALLOWED_VIDEO_TYPES = 'video/mp4, video/webm, video/quicktime'

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}

function inferContentType(file: File, accept: string): File {
  if (file.type) return file
  const ext = file.name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  }
  const type = ext ? map[ext] : undefined
  if (!type) return file
  return new File([file], file.name, { type })
}

export function createImageUploadItem(
  upload: (file: File) => Promise<{ key: string }>,
): SlashCommandItem {
  return {
    id: 'image',
    label: 'Imagem',
    description: 'Enviar uma imagem',
    keywords: ['imagem', 'image', 'foto'],
    group: 'midia',
    icon: Image01Icon,
    run: (editor, range) => {
      pickFile(ALLOWED_IMAGE_TYPES).then((file) => {
        if (!file) return
        const normalized = inferContentType(file, ALLOWED_IMAGE_TYPES)
        upload(normalized).then(({ key }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({ type: 'editorImage', attrs: { mediaKey: key } })
            .run()
        })
      })
    },
  }
}

export function createVideoUploadItem(
  upload: (file: File) => Promise<{ key: string }>,
): SlashCommandItem {
  return {
    id: 'video',
    label: 'Vídeo',
    description: 'Enviar um vídeo',
    keywords: ['video', 'filme'],
    group: 'midia',
    icon: Video01Icon,
    run: (editor, range) => {
      pickFile(ALLOWED_VIDEO_TYPES).then((file) => {
        if (!file) return
        const normalized = inferContentType(file, ALLOWED_VIDEO_TYPES)
        upload(normalized).then(({ key }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({ type: 'editorVideo', attrs: { mediaKey: key } })
            .run()
        })
      })
    },
  }
}
