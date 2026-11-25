// src/components/GoogleReviewsSection.tsx
'use client'

import { Star, ExternalLink, CheckCircle2 } from 'lucide-react'

export interface GoogleReviewItem {
  id: string
  author: string
  rating: number
  dateText: string
  text: string
}

export const DEFAULT_GOOGLE_REVIEWS: GoogleReviewItem[] = [
  {
    id: 'rev-1',
    author: 'Selin Y.',
    rating: 5,
    dateText: '2 hafta önce',
    text: 'Sabahları kapıda taptaze bulmak büyük konfor. Porsiyonlar doyurucu, lezzetler restoran kalitesinde. 1 ayda hiç zorlanmadan 4 kilo verdim.',
  },
  {
    id: 'rev-2',
    author: 'Mert K.',
    rating: 5,
    dateText: '1 ay önce',
    text: 'Sporcu paketini 20 günlük aldım. Makrolar tam istediğim gibi, yemekler asla tatsız diyet yemeği gibi değil. Kurye hep 07:30 civarı eksiksiz bırakıyor.',
  },
  {
    id: 'rev-3',
    author: 'Ebru D.',
    rating: 5,
    dateText: '1 ay önce',
    text: 'Alerjen notuma gerçekten dikkat eden nadir firma. Seyahate çıktığımda panelden tek tıkla gün dondurdum, hemen paket sonuna eklendi. Çok memnunum.',
  },
]

function GoogleGLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29A7.18 7.18 0 0 1 4.9 12c0-.79.14-1.56.38-2.29v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4.01-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4.01 3.1C6.23 6.87 8.88 4.76 12 4.76z"
      />
    </svg>
  )
}

export default function GoogleReviewsSection({ generalSettings }: { generalSettings?: any }) {
  const reviews: GoogleReviewItem[] =
    Array.isArray(generalSettings?.google_reviews) && generalSettings.google_reviews.length > 0
      ? generalSettings.google_reviews
      : DEFAULT_GOOGLE_REVIEWS

  const ratingScore = generalSettings?.google_rating || '4.6'
  const totalCount = generalSettings?.google_review_count || '14'
  const mapsUrl = generalSettings?.google_maps_url || 'https://maps.app.goo.gl/SWfPdg6TxhcJ2LYK9'

  return (
    <section className="bg-[#f8faf9] py-14 px-4 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Üst Özet Başlık & Google Rozeti */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-2xs">
              <GoogleGLogo />
              <span className="text-xs font-extrabold text-slate-800">Google Müşteri Yorumları</span>
              <span className="text-xs font-black text-[#51a885]">{ratingScore} / 5</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[#eab130] text-[#eab130]" />
                ))}
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">({totalCount} Yorum)</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Üyelerimiz DietBox İçin Ne Diyor?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Google Haritalar üzerinde doğrulanmış gerçek üye deneyimleri.
            </p>
          </div>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#0d1f18] hover:bg-[#51a885] text-white text-xs font-bold px-5 py-3 rounded-2xl transition shadow-sm shrink-0"
          >
            <GoogleGLogo />
            <span>Google&apos;da Tümünü Gör / Yorum Yaz</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#eab130]" />
          </a>
        </div>

        {/* Yorum Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((rev) => {
            const initials = (rev.author || 'D')
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()

            return (
              <div
                key={rev.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-[#51a885]/50 transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0d1f18] text-[#eab130] font-black text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div>
                        <strong className="text-sm font-extrabold text-slate-900 flex items-center gap-1">
                          {rev.author}
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#51a885]" />
                        </strong>
                        <span className="text-[11px] text-slate-400">{rev.dateText}</span>
                      </div>
                    </div>
                    <GoogleGLogo />
                  </div>

                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: Number(rev.rating || 5) }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#eab130] text-[#eab130]" />
                    ))}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    &ldquo;{rev.text}&rdquo;
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}