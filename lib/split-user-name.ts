export function splitUserName(fullName?: string | null) {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return { firstName: '', lastName: '' }
  }

  const [firstName, ...rest] = parts

  return {
    firstName,
    lastName: rest.join(' ')
  }
}
