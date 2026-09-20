import axe, { type AxeResults, type RunOptions } from 'axe-core'

// Rules that cannot produce a meaningful result in jsdom: there is no layout
// or painting, so contrast and geometry checks either crash or report noise.
const JSDOM_UNSUPPORTED_RULES = [
  'color-contrast',
  'target-size',
  'scrollable-region-focusable',
]

function describeViolations(results: AxeResults): string {
  return results.violations
    .map((violation) => {
      const targets = violation.nodes
        .map((node) => `      ${node.target.join(' ')}`)
        .join('\n')
      return `  [${violation.impact ?? 'n/a'}] ${violation.id}: ${violation.help}\n${targets}\n      ${violation.helpUrl}`
    })
    .join('\n')
}

/**
 * Runs axe over a rendered tree and fails with the offending selectors.
 *
 * ```ts
 * const { container } = renderWithProviders(<SignInForm />)
 * await expectNoA11yViolations(container)
 * ```
 *
 * `disabledRules` is for rules a component legitimately cannot satisfy on its
 * own (e.g. `region`, when the test renders a fragment of a page).
 */
export async function expectNoA11yViolations(
  container: Element,
  {
    disabledRules = [] as string[],
    ...options
  }: RunOptions & {
    disabledRules?: string[]
  } = {},
): Promise<void> {
  const rules = Object.fromEntries(
    [...JSDOM_UNSUPPORTED_RULES, ...disabledRules].map((id) => [
      id,
      { enabled: false },
    ]),
  )

  const results = await axe.run(container, {
    ...options,
    rules: { ...rules, ...(options.rules ?? {}) },
  })

  if (results.violations.length > 0) {
    throw new Error(
      `Acessibilidade: ${results.violations.length} violação(ões)\n${describeViolations(results)}`,
    )
  }
}
