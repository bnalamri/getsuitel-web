import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'GetSuitel — Smart Real Estate Management', template: '%s | GetSuitel' },
  description: 'Professional SaaS platform for real estate management. Manage properties, tenants, contracts, maintenance, and finances in one place.',
  keywords: ['real estate', 'property management', 'tenant management', 'rent collection', 'maintenance', 'إدارة عقارات'],
  authors: [{ name: 'GetSuitel' }],
  creator: 'GetSuitel',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'ar_SA',
    url: 'https://getsuitel.com',
    siteName: 'GetSuitel',
    title: 'GetSuitel — Smart Real Estate Management',
    description: 'Professional SaaS platform for real estate management.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'GetSuitel' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GetSuitel — Smart Real Estate Management',
    description: 'Professional SaaS platform for real estate management.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
