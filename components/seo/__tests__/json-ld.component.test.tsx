import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { JsonLd } from '../json-ld'

function scriptOf(data: Record<string, unknown>) {
  const { container } = render(<JsonLd data={data} />)
  return container.querySelector('script[type="application/ld+json"]')
}

describe('<JsonLd />', () => {
  it('publishes the data as JSON-LD', () => {
    const script = scriptOf({ '@type': 'FAQPage', name: 'Perguntas' })

    expect(JSON.parse(script?.textContent ?? '')).toEqual({
      '@type': 'FAQPage',
      name: 'Perguntas',
    })
  })

  // A value holding </script> must not close the tag it lives in.
  it('escapes "<" so a value cannot break out of the script tag', () => {
    const script = scriptOf({ name: '</script><img src=x onerror=alert(1)>' })

    expect(script?.innerHTML).not.toContain('</script>')
    expect(script?.innerHTML).toContain('\\u003c/script>')
    expect(JSON.parse(script?.textContent ?? '').name).toBe(
      '</script><img src=x onerror=alert(1)>',
    )
  })
})
