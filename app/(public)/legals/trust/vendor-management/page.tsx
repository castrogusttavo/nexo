import type { Metadata } from 'next'

const TITLE = 'Gerenciamento de Fornecedores | Nexo'
const DESCRIPTION = 'Como o Nexo avalia e gerencia fornecedores terceiros.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/trust/vendor-management' },
  openGraph: {
    type: 'website',
    url: '/legals/trust/vendor-management',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/twitter-image'],
  },
}

export default function VendorManagementPage() {
  return <span>Gerenciamento de Vendor</span>
}
