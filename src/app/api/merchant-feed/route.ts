// src/app/api/merchant-feed/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toAbsoluteUrl(url: string, baseUrl: string): string {
  if (!url) return `${baseUrl}/images/logo.png`
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dietbox-web.vercel.app').replace(
    /\/$/,
    ''
  )

  const supabase = createAdminClient()
  const { data: packages, error } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return new NextResponse('Feed error', { status: 500 })
  }

  const itemsXml = (packages || [])
    .map((pkg) => {
      // Varsa en düşük paket periyodu toplam fiyatını, yoksa günlük baz fiyatı kullan
      const tiers = Array.isArray(pkg.custom_duration_prices) ? pkg.custom_duration_prices : []
      const firstTier = tiers.length > 0 ? tiers[0] : null
      const priceValue =
        firstTier && Number(firstTier.total_price) > 0
          ? Number(firstTier.total_price)
          : Number(pkg.daily_base_price || 0)

      const link = `${baseUrl}/paketler/${pkg.slug}`
      const imageLink = toAbsoluteUrl(pkg.cover_image || '', baseUrl)
      const description = (
        pkg.meta_description ||
        pkg.short_description ||
        pkg.full_description ||
        pkg.title
      )
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 4900)

      return `    <item>
      <g:id>DIETBOX-${escapeXml(String(pkg.id))}</g:id>
      <g:title>${escapeXml(pkg.meta_title || pkg.title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(imageLink)}</g:image_link>
      <g:availability>in_stock</g:availability>
      <g:price>${priceValue.toFixed(2)} TRY</g:price>
      <g:brand>DietBox</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:product_type>${escapeXml(pkg.category || 'Diyet Paketleri')}</g:product_type>
      <g:google_product_category>Food, Beverages &amp; Tobacco &gt; Food Items &gt; Prepared Foods</g:google_product_category>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>DietBox Diyet Yemek Paketleri</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>Diyetisyen kontrolünde günlük taze adrese teslim diyet yemek paketleri</description>
${itemsXml}
  </channel>
</rss>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  })
}