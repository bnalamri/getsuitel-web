import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.getsuitel.com'),
  title: { default: 'GetSuitel — Smart Real Estate Management', template: '%s | GetSuitel' },
  description: 'GetSuitel brings property owners, tenants, and service teams together in one platform. Manage contracts, maintenance, invoices, and reports — all in one place. منصة إدارة العقارات الذكية.',
  keywords: ['real estate management', 'property management software', 'tenant management', 'rent collection', 'maintenance requests', 'إدارة عقارات', 'برنامج إدارة العقارات', 'مستأجرين', 'عقود إيجار'],
  authors: [{ name: 'GetSuitel' }],
  creator: 'GetSuitel',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'ar_SA',
    url: 'https://www.getsuitel.com',
    siteName: 'GetSuitel',
    title: 'GetSuitel — Smart Real Estate Management Platform',
    description: 'One platform for property owners, tenants, and service teams. Contracts, maintenance, invoicing — all in one place.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'GetSuitel — Smart Real Estate Management' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GetSuitel — Smart Real Estate Management Platform',
    description: 'One platform for property owners, tenants, and service teams.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
