import { requireConsentedUser } from '@/src/lib/dal'

// For a private page with no server data of its own (a client form, say):
// renders nothing, and redirects to the consent step when consent is missing
// (STR-61). Put it inside <Suspense> next to the page so it never blocks;
// pages and layouts that read data call the DAL themselves instead.
export async function ConsentGate({ resource }: { resource: string }) {
  await requireConsentedUser(resource)
  return null
}
