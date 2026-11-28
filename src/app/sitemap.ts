// src/app/sitemap.ts
import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dietbox-web.vercel.app').replace(
    /\/$/,
    ''
  )

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/paketler`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/kalori-hesaplama`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/fiyatlarimiz`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/tedarikcilerimiz`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/sikca-sorulan-sorular`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/iletisim`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ]

  try {
    const supabase = createAdminClient()
    const [pkgRes, corpRes, blogRes] = await Promise.all([
      supabase.from('packages').select('slug, updated_at, created_at').eq('is_active', true),
      supabase.from('corporate_pages').select('slug, updated_at, created_at').eq('is_active', true),
      supabase
        .from('blog_posts')
        .select('slug, updated_at, published_at')
        .eq('status', 'published'),
    ])

    const packageRoutes: MetadataRoute.Sitemap = (pkgRes.data || []).map((p) => ({
      url: `${baseUrl}/paketler/${p.slug}`,
      lastModified: new Date(p.updated_at || p.created_at || Date.now()),
      changeFrequency: 'weekly',
      priority: 0.9,
    }))

    const corporateRoutes: MetadataRoute.Sitemap = (corpRes.data || []).map((c) => ({
      url: `${baseUrl}/kurumsal/${c.slug}`,
      lastModified: new Date(c.updated_at || c.created_at || Date.now()),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

    const blogRoutes: MetadataRoute.Sitemap = (blogRes.data || []).map((b) => ({
      url: `${baseUrl}/blog/${b.slug}`,
      lastModified: new Date(b.updated_at || b.published_at || Date.now()),
      changeFrequency: 'weekly',
      priority: 0.75,
    }))

    return [...staticRoutes, ...packageRoutes, ...blogRoutes, ...corporateRoutes]
  } catch {
    return staticRoutes
  }
}