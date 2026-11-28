// src/app/layout.tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import CookieConsent from '@/components/CookieConsent'
import ActivityTracker from '@/components/ActivityTracker'
import { createAdminClient } from '@/lib/supabase/server'
import TrackingScripts, { TrackingConfig } from '@/components/TrackingScripts'

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  let trackingConfig: TrackingConfig | null = null

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'tracking_config')
      .single()
    trackingConfig = data?.value || null
  } catch {
    trackingConfig = null
  }

  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <head>
        {trackingConfig?.is_enabled !== false && trackingConfig?.gsc_verification && (
          <meta
            name="google-site-verification"
            content={trackingConfig.gsc_verification}
          />
        )}
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <TrackingScripts config={trackingConfig} />
        <CookieConsent />
        <ActivityTracker />
        {children}
      </body>
    </html>
  )
}