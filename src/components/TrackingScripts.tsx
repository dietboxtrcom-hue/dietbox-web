// src/components/TrackingScripts.tsx
'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'

export interface TrackingConfig {
  is_enabled?: boolean
  gsc_verification?: string
  ga4_id?: string
  gtm_id?: string
  meta_pixel_id?: string
  google_ads_id?: string
  clarity_id?: string
}

export default function TrackingScripts({ config }: { config?: TrackingConfig | null }) {
  const pathname = usePathname()
  const isFirstRender = useRef(true)

  const isExcludedRoute =
    pathname?.startsWith('/admin') || pathname?.startsWith('/kurye')

  const enabled = config && config.is_enabled !== false && !isExcludedRoute

  const ga4Id = (config?.ga4_id || '').trim()
  const gtmId = (config?.gtm_id || '').trim()
  const metaPixelId = (config?.meta_pixel_id || '').trim()
  const googleAdsId = (config?.google_ads_id || '').trim()
  const clarityId = (config?.clarity_id || '').trim()

  const primaryGtagId = ga4Id || googleAdsId

  // Next.js SPA sayfa geçişlerinde Meta Pixel PageView tetikle
  useEffect(() => {
    if (!enabled || !metaPixelId) return
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const fbq = (window as any).fbq
    if (typeof fbq === 'function') {
      fbq('track', 'PageView')
    }
  }, [pathname, enabled, metaPixelId])

  if (!enabled) return null

  return (
    <>
      {/* GOOGLE ANALYTICS 4 & GOOGLE ADS (GTAG) */}
      {primaryGtagId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryGtagId)}`}
            strategy="afterInteractive"
          />
          <Script id="dietbox-gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              ${ga4Id ? `gtag('config', '${ga4Id}', { send_page_view: true });` : ''} ${googleAdsId ? `gtag('config', '${googleAdsId}');` : ''}
            `}
          </Script>
        </>
      )}

      {/* GOOGLE TAG MANAGER */}
      {gtmId && (
        <Script id="dietbox-gtm-init" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `}
        </Script>
      )}

      {/* META (FACEBOOK / INSTAGRAM) PIXEL */}
      {metaPixelId && (
        <Script id="dietbox-meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {/* MICROSOFT CLARITY (ISI HARİTASI & OTURUM KAYDI) */}
      {clarityId && (
        <Script id="dietbox-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId}");
          `}
        </Script>
      )}
    </>
  )
}