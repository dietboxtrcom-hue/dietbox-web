// src/app/layout.tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import CookieConsent from '@/components/CookieConsent'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// Next.js 16.4+ canlı Supabase sorgularında Blocking Route uyarısını kapatır
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'DietBox | Diyetisyen Kontrolünde Günlük Taze Diyet Yemek Paketleri',
  description:
    'Kişiye özel kalori hesaplamalı, her sabah kapınıza taze teslim edilen sağlıklı diyet yemek paketleri.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <CookieConsent/>
        {children}
      </body>
    </html>
  )
}