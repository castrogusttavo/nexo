// biome-ignore-all lint/suspicious/noExplicitAny: schema.org JSON-LD has no useful generic type in the JS ecosystem

// JSON.stringify leaves `<` as is, so a value holding `</script>` (a blog
// title, a FAQ answer) would close the tag and inject markup. \u003c is the
// same character to a JSON parser and inert to the HTML one.
function serializeJsonLd(data: Record<string, any>) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function JsonLd({ data }: { data: Record<string, any> }) {
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: serialized by serializeJsonLd, which escapes `<`; not HTML/user input
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
