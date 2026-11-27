// src/app/api/google-reviews/route.ts
import { NextResponse } from 'next/server'

export const revalidate = 21600 // 6 saatte bir taze veri çeker

export async function GET() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  const placeId = process.env.GOOGLE_PLACE_ID

  if (!apiKey || !placeId) {
    return NextResponse.json({
      source: 'fallback',
      rating: null,
      totalReviews: null,
      reviews: [],
    })
  }

  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'displayName,rating,userRatingCount,reviews,googleMapsUri',
      },
      next: { revalidate: 21600 },
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      return NextResponse.json({
        source: 'fallback',
        error: data?.error?.message || `HTTP ${res.status}`,
        reviews: [],
      })
    }

    const rawReviews = Array.isArray(data.reviews) ? data.reviews : []

    const mappedReviews = rawReviews.map((r: any, idx: number) => {
      const textContent = (r.text?.text || r.originalText?.text || '').trim()
      return {
        id: r.name || `google-${idx}`,
        author: r.authorAttribution?.displayName || 'Google Kullanıcısı',
        avatar: r.authorAttribution?.photoUri || null,
        rating: r.rating || 5,
        dateText: r.relativePublishTimeDescription || 'Google Yorumu',
        text: textContent || `${r.rating || 5} yıldız ile değerlendirdi.`,
      }
    })

    return NextResponse.json({
      source: 'google_live',
      rating: data.rating ? String(data.rating) : null,
      totalReviews: data.userRatingCount ? String(data.userRatingCount) : null,
      mapsUrl: data.googleMapsUri || null,
      rawReviewsCount: rawReviews.length,
      reviews: mappedReviews,
    })
  } catch (err: any) {
    return NextResponse.json({
      source: 'fallback',
      error: err?.message || 'Bağlantı hatası',
      reviews: [],
    })
  }
}