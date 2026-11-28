// src/app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dietbox-web.vercel.app').replace(
    /\/$/,
    ''
  )

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/kurye', '/kurye/', '/api/', '/hesabim', '/odeme'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}