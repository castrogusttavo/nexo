export type EmbedProvider = 'figma' | 'loom' | 'youtube' | 'google-docs' | 'google-sheets'

interface EmbedProviderDefinition {
  provider: EmbedProvider
  label: string
  match: (url: URL) => boolean
  toEmbedUrl: (url: URL) => string
}

const EMBED_PROVIDERS: EmbedProviderDefinition[] = [
  {
    provider: 'figma',
    label: 'Figma',
    match: (url) => url.hostname === 'www.figma.com' || url.hostname === 'figma.com',
    toEmbedUrl: (url) =>
      `https://www.figma.com/embed?embed_host=nexo&url=${encodeURIComponent(url.toString())}`,
  },
  {
    provider: 'loom',
    label: 'Loom',
    match: (url) => url.hostname === 'www.loom.com' || url.hostname === 'loom.com',
    toEmbedUrl: (url) => `https://www.loom.com/embed/${url.pathname.split('/').pop()}`,
  },
  {
    provider: 'youtube',
    label: 'YouTube',
    match: (url) =>
      url.hostname === 'www.youtube.com' ||
      url.hostname === 'youtube.com' ||
      url.hostname === 'youtu.be',
    toEmbedUrl: (url) => {
      const id =
        url.hostname === 'youtu.be' ? url.pathname.slice(1) : (url.searchParams.get('v') ?? '')
      return `https://www.youtube.com/embed/${id}`
    },
  },
  {
    provider: 'google-docs',
    label: 'Google Docs',
    match: (url) => url.hostname === 'docs.google.com' && url.pathname.startsWith('/document'),
    toEmbedUrl: (url) => url.toString().replace(/\/edit.*$/, '/preview'),
  },
  {
    provider: 'google-sheets',
    label: 'Google Sheets',
    match: (url) => url.hostname === 'docs.google.com' && url.pathname.startsWith('/spreadsheets'),
    toEmbedUrl: (url) => url.toString().replace(/\/edit.*$/, '/preview'),
  },
]

export interface EmbedMatch {
  provider: EmbedProvider
  label: string
  embedUrl: string
  sourceUrl: string
}

export function matchEmbedProvider(rawUrl: string): EmbedMatch | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null

  const definition = EMBED_PROVIDERS.find((p) => p.match(url))
  if (!definition) return null

  return {
    provider: definition.provider,
    label: definition.label,
    embedUrl: definition.toEmbedUrl(url),
    sourceUrl: url.toString(),
  }
}
