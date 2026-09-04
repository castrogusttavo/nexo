import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nexo — gestão de projetos nativa em IA',
    short_name: 'Nexo',
    description:
      'Nexo reúne projetos, documentação e fluxos de trabalho com IA em um único workspace.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0b0c',
    theme_color: '#0b0b0c',
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
