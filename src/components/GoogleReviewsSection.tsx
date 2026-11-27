// src/components/GoogleReviewsSection.tsx
'use client'

import { useEffect, useState } from 'react'
import { Star, ChevronLeft, ChevronRight, ExternalLink, CheckCircle2 } from 'lucide-react'

interface ReviewItem {
  id: string
  author: string
  avatar?: string | null
  rating: number
  dateText: string
  text: string
}

const DEFAULT_REVIEWS: ReviewItem[] = [
  {
    id: 'def-1',
    author: 'Selin Y.',
    rating: 5,
    dateText: '2 hafta önce',
    text: 'Sabahları kapıda taptaze bulmak büyük konfor. Porsiyonlar doyurucu, lezzetler restoran kalitesinde. 1 ayda hiç zorlanmadan 4 kilo verdim.',
  },
  {
    id: 'def-2',
    author: 'Mert K.',
    rating: 5,
    dateText: '1 ay önce',
    text: 'Sporcu paketini 20 günlük aldım. Makrolar tam istediğim gibi, yemekler asla tatsız diyet yemeği gibi değil. Kurye hep 07:30 civarı eksiksiz bırakıyor.',
  },
  {
    id: 'def-3',
    author: 'Ebru D.',
    rating: 5,
    dateText: '1 ay önce',
    text: 'Alerjen notuma gerçekten dikkat eden nadir firma. Seyahate çıktığımda panelden tek tıkla gün dondurdum, hemen paket sonuna eklendi. Çok memnunum.',
  },
]

function GoogleGIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.51 5.51 0 0 1-2.39 3.61v3h3.87c2.26-2.08 3.57-5.15 3.57-8.64z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.29v-3.1H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.39l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.61l4 3.1c.94-2.84 3.59-4.95 6.71-4.95z"
      />
    </svg>
  )
}

export default function GoogleReviewsSection({ generalSettings }: { generalSettings?: any }) {
  const adminReviews: ReviewItem[] =
    Array.isArray(generalSettings?.google_reviews) && generalSettings.google_reviews.length > 0
      ? generalSettings.google_reviews
      : DEFAULT_REVIEWS

  const [reviews, setReviews] = useState<ReviewItem[]>(adminReviews)
  const [rating, setRating] = useState<string>(generalSettings?.google_rating || '4.6')
  const [totalCount, setTotalCount] = useState<string>(
    generalSettings?.google_review_count || '14'
  )
  const [mapsUrl, setMapsUrl] = useState<string>(
    generalSettings?.google_maps_url || 'https://maps.app.goo.gl/SWfPdg6TxhcJ2LYK9'
  )
  const [isLive, setIsLive] = useState(false)

  // Carousel state
  const [startIndex, setStartIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    fetch('/api/google-reviews')
      .then((r) => r.json())
      .then((data) => {
        if (data?.source === 'google_live') {
          if (data.rating) setRating(data.rating)
          if (data.totalReviews) setTotalCount(data.totalReviews)
          if (data.mapsUrl) setMapsUrl(data.mapsUrl)
          if (Array.isArray(data.reviews) && data.reviews.length > 0) {
            setReviews(data.reviews)
          }
          setIsLive(true)
        }
      })
      .catch(() => {})
  }, [])

  // Otomatik 3'lü kaydırma (5 saniyede bir, hover'da durur)
  useEffect(() => {
    if (paused || reviews.length <= 3) return
    const interval = setInterval(() => {
      setStartIndex((prev) => (prev + 1) % reviews.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [paused, reviews.length])

  const handlePrev = () => {
    setStartIndex((prev) => (prev - 1 + reviews.length) % reviews.length)
  }

  const handleNext = () => {
    setStartIndex((prev) => (prev + 1) % reviews.length)
  }

  // Ekranda gösterilecek 3 kartı döngüsel olarak seç
  const visibleCount = Math.min(3, reviews.length)
  const visibleReviews = Array.from({ length: visibleCount }, (_, offset) => {
    return reviews[(startIndex + offset) % reviews.length]
  })

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

  return (
    <section
      className="bg-[#f8faf9] py-14 px-4 sm:px-6 border-t border-slate-200/80"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Üst Başlık ve Canlı Google Puan Bandı */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-2xs">
              <GoogleGIcon />
              <span className="text-xs font-black text-slate-900">{rating}</span>
              <div className="flex items-center text-amber-400">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-500">
                ({totalCount} Google Yorumu{isLive ? ' • Canlı' : ''})
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
              Mutlu DietBox Üyelerimiz
            </h3>
          </div>

          <div className="flex items-center gap-2.5">
            {reviews.length > 3 && (
              <div className="flex items-center gap-1.5 mr-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Önceki Yorum"
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:border-[#51a885] hover:text-[#51a885] flex items-center justify-center transition cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Sonraki Yorum"
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:border-[#51a885] hover:text-[#51a885] flex items-center justify-center transition cursor-pointer shadow-2xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#0d1f18] hover:bg-[#51a885] text-white text-xs font-bold px-4 py-2.5 rounded-full transition"
            >
              Google&apos;da Yorum Yap
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* 3'lü Carousel Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {visibleReviews.map((rev, i) => (
            <article
              key={`${rev.id}-${startIndex}-${i}`}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-[#51a885]/50 transition-all duration-300 flex flex-col justify-between gap-4"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {rev.avatar ? (
                      <img
                        src={rev.avatar}
                        alt={rev.author}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#0d1f18] text-white text-xs font-black flex items-center justify-center">
                        {getInitials(rev.author)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1">
                        <strong className="text-sm font-extrabold text-slate-900">
                          {rev.author}
                        </strong>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#51a885]" />
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">{rev.dateText}</span>
                    </div>
                  </div>
                  <GoogleGIcon />
                </div>

                <div className="flex items-center gap-0.5 text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= (rev.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-5">
                  &ldquo;{rev.text}&rdquo;
                </p>
              </div>
            </article>
          ))}
        </div>

        {/* Alt Nokta Göstergeleri */}
        {reviews.length > 3 && (
          <div className="flex items-center justify-center gap-2 pt-1">
            {reviews.map((rev, idx) => (
              <button
                key={rev.id}
                type="button"
                onClick={() => setStartIndex(idx)}
                aria-label={`Yorum ${idx + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === startIndex ? 'w-7 bg-[#51a885]' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}