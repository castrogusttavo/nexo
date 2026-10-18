import type { Metadata } from 'next'
import { resolvePlatformAdmin } from '@/src/lib/admin-access'

// What app/not-found.tsx declares: a non-admin gets the same metadata a
// made-up path gets.
const NOT_FOUND_METADATA: Metadata = {
  title: 'Página não encontrada | Nexo',
  description: 'A página que você procurava não existe ou foi movida.',
}

/**
 * Metadata for an admin page, decided by the same gate as the admin layout.
 *
 * A static `metadata` export is resolved on its own, apart from the layout
 * that answers 404, so its title reached the response of a signed-in stranger
 * and named an area the 404 was meant to hide.
 */
export function adminMetadata(title: string) {
  return async function generateMetadata(): Promise<Metadata> {
    const admin = await resolvePlatformAdmin()
    if (!admin.ok) return NOT_FOUND_METADATA
    return { title, robots: { index: false, follow: false } }
  }
}
