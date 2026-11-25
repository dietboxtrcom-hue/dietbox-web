// src/components/HeroSlider.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'

interface SlideItem {
  id: number
  badge_text: string
  title: string
  subtitle: string
  price_highlight: string
  button_text: string
  button_url: string
  media_type: 'image' | 'video'
  media_url: string
}

export default function HeroSlider({ slides }: { slides: SlideItem[] }) {
  const activeSlides =
    slides && slides.length > 0
      ? slides
      : [
          {
            id: 1,
            badge_text: 'ADRESE TESLİM DİYET PAKETLERİ',
            title: 'Zayıflama ve Dengeli Beslenme Paketi',
            subtitle:
              'Diyetisyen kontrolünde kalorisi hesaplanmış, her sabah 06:00 - 09:30 arası kapınıza taze teslim edilen günlük öğünler.',
            price_highlight: "990 ₺'den başlayan fiyatlarla",
            button_text: 'Paketi İncele',
            button_url: '/paketler/zayiflama-ve-dengeli-beslenme-paketi',
            media_type: 'image' as const,
            media_url: 'https://www.dietboxtr.com/wp-content/uploads/2020/07/dietbox-19.jpg',
          },
        ]

  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (activeSlides.length <= 1) return
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === activeSlides.length - 1 ? 0 : prev + 1))
    }, 6500)
    return () => clearInterval(timer)
  }, [activeSlides.length])

  const slide = activeSlides[current] || activeSlides[0]

  return (
    <section className="relative w-full min-h-[76vh] lg:min-h-[82vh] flex items-center overflow-hidden bg-[#0d1f18]">
      {/* Tam Ekran Arka Plan Görseli veya Video */}
      <div className="absolute inset-0 z-0">
        {slide.media_type === 'video' ? (
          <video
            key={slide.media_url}
            src={slide.media_url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <img
            key={slide.media_url}
            src={slide.media_url}
            alt={slide.title}
            className="w-full h-full object-cover object-center transition-all duration-1000 scale-[1.02]"
          />
        )}

        {/* Soldan ve Alttan Zarif Editorial Okunabilirlik Geçişi */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1f18]/90 via-[#0d1f18]/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f18]/75 via-transparent to-[#0d1f18]/20" />
      </div>

      {/* İçerik Alanı (Sade, Ferah, Karmaşadan Uzak) */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-5 sm:px-8 py-20 lg:py-28">
        <div className="max-w-2xl space-y-6">
          {slide.badge_text && (
            <div className="flex items-center gap-3">
              <span className="h-[2px] w-8 bg-[#eab130]" />
              <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[#eab130]">
                {slide.badge_text}
              </span>
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08]">
            {slide.title}
          </h1>

          {slide.subtitle && (
            <p className="text-sm sm:text-lg text-white/85 leading-relaxed max-w-xl font-normal">
              {slide.subtitle}
            </p>
          )}

          {slide.price_highlight && (
            <p className="text-xl sm:text-2xl font-extrabold text-[#eab130] tracking-tight">
              {slide.price_highlight}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href={slide.button_url || '/paketler'}
              className="bg-[#51a885] hover:bg-[#3f8d6d] text-white font-bold px-8 py-4 rounded-full text-sm transition flex items-center gap-2.5 shadow-lg shadow-black/20"
            >
              <span>{slide.button_text || 'Paketi İncele'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/fiyatlarimiz"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/25 font-semibold px-7 py-4 rounded-full text-sm transition"
            >
              Fiyat Listesi
            </Link>
          </div>
        </div>
      </div>

      {/* Minimal Alt Sağ Kontrol Barı */}
      {activeSlides.length > 1 && (
        <div className="absolute bottom-6 inset-x-0 z-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
            {/* İnce Çizgi Göstergeleri */}
            <div className="flex items-center gap-2.5">
              {activeSlides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrent(idx)}
                  aria-label={`Slayt ${idx + 1}`}
                  className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                    current === idx ? 'w-12 bg-[#eab130]' : 'w-5 bg-white/35 hover:bg-white/60'
                  }`}
                />
              ))}
              <span className="ml-3 text-xs font-bold text-white/75 tracking-widest">
                0{current + 1} / 0{activeSlides.length}
              </span>
            </div>

            {/* Minimal Oklar */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrent((prev) => (prev === 0 ? activeSlides.length - 1 : prev - 1))
                }
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrent((prev) => (prev === activeSlides.length - 1 ? 0 : prev + 1))
                }
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}