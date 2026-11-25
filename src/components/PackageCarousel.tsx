// src/components/PackageCarousel.tsx
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatTRY } from '@/lib/pricing-engine'
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  ArrowRight,
  LayoutGrid,
  Utensils,
  Sparkles,
} from 'lucide-react'

interface Props {
  packages: any[]
}

export default function PackageCarousel({ packages }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü')
  const [pageIndex, setPageIndex] = useState<number>(0)
  const itemsPerPage = 3

  const categories = useMemo(() => {
    const cats = new Set<string>(['Tümü'])
    packages.forEach((p) => {
      if (p.category) cats.add(p.category)
    })
    return Array.from(cats)
  }, [packages])

  const filtered = useMemo(() => {
    if (selectedCategory === 'Tümü') return packages
    return packages.filter((p) => p.category === selectedCategory)
  }, [packages, selectedCategory])

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const currentBlock = filtered.slice(
    pageIndex * itemsPerPage,
    pageIndex * itemsPerPage + itemsPerPage
  )

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat)
    setPageIndex(0)
  }

  const prevSlide = () => {
    setPageIndex((prev) => (prev === 0 ? totalPages - 1 : prev - 1))
  }

  const nextSlide = () => {
    setPageIndex((prev) => (prev === totalPages - 1 ? 0 : prev + 1))
  }

  return (
    <section id="paketler" className="py-12 space-y-8">
      {/* Üst Başlık ve Oklar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#51a885] bg-[#51a885]/10 px-3.5 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-[#eab130]" />
            Kişiye Özel Beslenme Programları
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Popüler Diyet & Detoks Paketlerimiz
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={prevSlide}
            className="w-11 h-11 rounded-2xl bg-white border border-slate-200 hover:border-[#51a885] hover:bg-[#51a885] text-slate-800 hover:text-white flex items-center justify-center shadow-sm transition cursor-pointer"
            title="Önceki 3 Paket"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-black text-slate-700 bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl">
            {pageIndex + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={nextSlide}
            className="w-11 h-11 rounded-2xl bg-white border border-slate-200 hover:border-[#51a885] hover:bg-[#51a885] text-slate-800 hover:text-white flex items-center justify-center shadow-sm transition cursor-pointer"
            title="Sonraki 3 Paket"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Kategori Filtre Kapsülleri */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#51a885] text-white shadow-md shadow-[#51a885]/25'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <Link
          href="/paketler"
          className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-900 bg-[#eab130]/20 hover:bg-[#eab130] px-4 py-2.5 rounded-xl transition"
        >
          <LayoutGrid className="w-4 h-4 text-slate-900" />
          Tüm 21 Paketi Alt Alta İncele
        </Link>
      </div>

      {/* 3'lü Premium Ürün Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {currentBlock.map((pkg) => {
          const tiers = Array.isArray(pkg.custom_duration_prices)
            ? pkg.custom_duration_prices
            : []

          return (
            <div
              key={pkg.id}
              className="group bg-white rounded-[2rem] border border-slate-200/90 hover:border-[#51a885] overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.04)] hover:shadow-[0_25px_50px_rgba(81,168,133,0.18)] transition-all duration-300 hover:-translate-y-1.5 flex flex-col"
            >
              {/* Üst Görsel */}
              <div className="aspect-[16/11] bg-slate-100 relative overflow-hidden">
                <img
                  src={
                    pkg.cover_image ||
                    'https://www.dietboxtr.com/wp-content/uploads/2020/07/dietbox-19.jpg'
                  }
                  alt={pkg.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f18]/80 via-transparent to-transparent" />

                <span className="absolute top-4 left-4 bg-[#0d1f18]/85 backdrop-blur-md text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-white/15">
                  <Flame className="w-3.5 h-3.5 text-[#eab130]" />
                  {pkg.category || 'Diyet Paketi'}
                </span>

                <span className="absolute bottom-3 left-4 bg-[#eab130] text-slate-950 text-[11px] font-black px-3 py-1 rounded-lg flex items-center gap-1 shadow">
                  <Utensils className="w-3 h-3" />
                  {pkg.meal_count_text || 'Günlük Taze Teslimat'}
                </span>
              </div>

              {/* İçerik */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold text-[#51a885] uppercase tracking-wider">
                    {pkg.calories_range || 'Kişiye Özel Kalori Planı'}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-[#51a885] transition">
                    {pkg.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {(pkg.short_description || '').replace(/\\n/g, ' ')}
                  </p>
                </div>

                {/* Periyot Mini Önizleme Şeridi */}
                {tiers.length > 0 && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-wrap gap-1.5">
                    {tiers.slice(0, 3).map((t: any, i: number) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700"
                      >
                        {t.days} Gün: <strong className="text-[#51a885]">{formatTRY(t.total_price)}</strong>
                      </span>
                    ))}
                  </div>
                )}

                {/* Alt Fiyat ve Seçim Butonu */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-400">
                      Günlük Başlangıç
                    </span>
                    <span className="text-2xl font-black text-slate-900">
                      {formatTRY(pkg.daily_base_price)}
                    </span>
                  </div>

                  <Link
                    href={`/paketler/${pkg.slug}`}
                    className="bg-[#51a885] hover:bg-[#0d1f18] text-white text-xs font-extrabold px-5 py-3.5 rounded-2xl transition flex items-center gap-2 shadow-md shadow-[#51a885]/20"
                  >
                    <span>Paketi Seç</span>
                    <ArrowRight className="w-4 h-4 text-[#eab130]" />
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sayfa Noktaları */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPageIndex(idx)}
              className={`h-2.5 rounded-full transition cursor-pointer ${
                pageIndex === idx ? 'w-10 bg-[#51a885]' : 'w-2.5 bg-slate-300'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}