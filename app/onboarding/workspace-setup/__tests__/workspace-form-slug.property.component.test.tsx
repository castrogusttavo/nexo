import { fireEvent, screen } from '@testing-library/react'
import fc from 'fast-check'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { WorkspaceForm } from '../workspace-form'

// Each run re-renders the form, so the count is lower than the 100 the pure
// property suites use: 40 still covers the alphabet and keeps every property
// well inside the 5s component-test timeout.
const RUNS = { numRuns: 40 }

const { createOnboardingWorkspace } = vi.hoisted(() => ({
  createOnboardingWorkspace: vi.fn(),
}))

// The real module is a server action; the form only needs the
// `(prevState, formData) => state` contract to render.
vi.mock('../actions', () => ({ createOnboardingWorkspace }))

const WORDS = [
  'Nexo',
  'Time',
  'Produção',
  'São Paulo',
  'Sênior',
  'R&D',
  'ACME  Inc.',
  'qa/staging',
  'Café',
  '2026',
  'dev-ops',
  '  ',
  '--',
  'Ação!',
  'Über',
  'coração',
]

/** Workspace names as people type them: accents, punctuation, extra spaces. */
const typedName = () =>
  fc.oneof(
    fc
      .array(fc.constantFrom(...WORDS), { minLength: 1, maxLength: 4 })
      .map((words) => words.join(' ')),
    fc.string({ maxLength: 60 }),
    fc.string({ unit: 'grapheme', maxLength: 40 }),
  )

const slugInput = () =>
  screen.getByRole('textbox', { name: /defina o url do seu workspace/i })

/** The value the form actually posts — `toSlug()` applied to the field. */
const submittedSlug = () =>
  (document.querySelector('input[name="slug"]') as HTMLInputElement).value

function typeInto(field: HTMLElement, value: string) {
  fireEvent.change(field, { target: { value } })
  return submittedSlug()
}

beforeEach(() => {
  createOnboardingWorkspace.mockResolvedValue({ ok: true })
})

describe('<WorkspaceForm /> slug normalisation (properties)', () => {
  it('the submitted slug only ever holds lowercase letters, digits and hyphens', () => {
    renderWithProviders(<WorkspaceForm />)

    fc.assert(
      fc.property(typedName(), (typed) => {
        expect(typeInto(slugInput(), typed)).toMatch(/^[a-z0-9-]*$/)
      }),
      RUNS,
    )
  })

  it('the submitted slug never starts or ends with a hyphen', () => {
    renderWithProviders(<WorkspaceForm />)

    fc.assert(
      fc.property(typedName(), (typed) => {
        const slug = typeInto(slugInput(), typed)

        expect(slug.startsWith('-')).toBe(false)
        expect(slug.endsWith('-')).toBe(false)
        expect(slug).not.toMatch(/--/)
      }),
      RUNS,
    )
  })

  it('the submitted slug never exceeds the 50-character limit', () => {
    renderWithProviders(<WorkspaceForm />)

    fc.assert(
      fc.property(
        fc.oneof(typedName(), fc.string({ minLength: 60, maxLength: 200 })),
        (typed) => {
          expect(typeInto(slugInput(), typed).length).toBeLessThanOrEqual(50)
        },
      ),
      RUNS,
    )
  })

  it('re-typing the submitted slug leaves it unchanged', () => {
    renderWithProviders(<WorkspaceForm />)

    fc.assert(
      fc.property(typedName(), (typed) => {
        const once = typeInto(slugInput(), typed)

        expect(typeInto(slugInput(), once)).toBe(once)
      }),
      RUNS,
    )
  })

  it('accented letters are transliterated, never dropped', () => {
    renderWithProviders(<WorkspaceForm />)

    fc.assert(
      fc.property(
        fc.constantFrom(
          ['Sênior', 'senior'],
          ['Produção', 'producao'],
          ['Café', 'cafe'],
          ['coração', 'coracao'],
          ['Ação', 'acao'],
          ['São Paulo', 'sao-paulo'],
        ),
        ([typed, expected]) => {
          expect(typeInto(slugInput(), typed)).toBe(expected)
        },
      ),
      RUNS,
    )
  })

  it('a name derives the same slug as typing that name into the URL field', () => {
    const derived = renderWithProviders(<WorkspaceForm />)
    // A second, independent form where the URL field is edited by hand.
    const typedByHand = renderWithProviders(<WorkspaceForm />)

    // Two forms are mounted at once, so the ids are duplicated: query each
    // field inside its own container, by attribute rather than by `#id`.
    const fieldsOf = (container: HTMLElement) => ({
      name: container.querySelector('input[id="name"]') as HTMLElement,
      slug: container.querySelector(
        'input[id="workspace-slug"]',
      ) as HTMLElement,
      submitted: () =>
        (container.querySelector('input[name="slug"]') as HTMLInputElement)
          .value,
    })

    const fromName = fieldsOf(derived.container)
    const fromSlug = fieldsOf(typedByHand.container)

    fc.assert(
      fc.property(typedName(), (typed) => {
        fireEvent.change(fromName.name, { target: { value: typed } })
        fireEvent.change(fromSlug.slug, { target: { value: typed } })

        expect(fromName.submitted()).toBe(fromSlug.submitted())
      }),
      RUNS,
    )
  })

  it('blurring the URL field shows exactly what will be submitted', () => {
    renderWithProviders(<WorkspaceForm />)

    fc.assert(
      fc.property(typedName(), (typed) => {
        const field = slugInput() as HTMLInputElement
        const submitted = typeInto(field, typed)
        fireEvent.blur(field)

        expect(field.value).toBe(submitted)
        expect(submittedSlug()).toBe(submitted)
      }),
      RUNS,
    )
  })
})
