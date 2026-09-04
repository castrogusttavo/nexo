// biome-ignore-all lint/suspicious/noExplicitAny: schema.org JSON-LD não tem um tipo genérico útil no ecossistema JS
export function JsonLd({ data }: { data: Record<string, any> }) {
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON.stringify de um objeto controlado internamente, não de HTML/entrada de usuário
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
