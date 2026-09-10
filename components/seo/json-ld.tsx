// biome-ignore-all lint/suspicious/noExplicitAny: schema.org JSON-LD has no useful generic type in the JS ecosystem
export function JsonLd({ data }: { data: Record<string, any> }) {
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON.stringify of an internally controlled object, not HTML/user input
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
