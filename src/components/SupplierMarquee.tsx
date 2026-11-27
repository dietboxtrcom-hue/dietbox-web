// src/components/SupplierMarquee.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Award } from 'lucide-react'

interface Supplier {
  id: number
  name: string
  logo_url: string
  category?: string
}

export default function SupplierMarquee() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  useEffect(() => {
    fetch('/api/suppliers?active=true', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.suppliers) && data.suppliers.length > 0) {
          setSuppliers(data.suppliers)
        }
      })
      .catch(() => {})
  }, [])

  if (suppliers.length === 0) return null

  const loopItems = [...suppliers, ...suppliers]

  return (
    <section className="bg-white border-y border-slate-200/90 py-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#51a885] mb-1">
            <Award className="w-4 h-4 text-[#eab130]" />
            1. Sınıf Mutfak Kalitesi
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
            Tedarikçilerimiz
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Sizlere en kaliteli yemekleri sunabilmek için Türkiye&apos;nin en güvenilir markalarıyla çalışıyoruz.
          </p>
        </div>

        <Link
          href="/tedarikcilerimiz"
          className="text-xs font-extrabold text-[#51a885] hover:text-[#0d1f18] inline-flex items-center gap-1 transition"
        >
          Tüm Tedarikçilerimiz <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="relative group">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-white to-transparent z-10" />

        <div className="flex w-max gap-5 animate-supplier-marquee group-hover:[animation-play-state:paused]">
          {loopItems.map((item, idx) => (
            <Link
              key={`${item.id}-${idx}`}
              href="/tedarikcilerimiz"
              className="w-40 sm:w-44 h-24 bg-white border border-slate-200/80 hover:border-[#51a885] rounded-2xl px-4 py-3 flex items-center justify-center shadow-2xs hover:shadow-md transition-all duration-300 shrink-0"
              title={item.name}
            >
              <img
                src={item.logo_url}
                alt={item.name}
                className="max-h-12 max-w-full object-contain grayscale-[20%] hover:grayscale-0 hover:scale-105 transition duration-300"
              />
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes supplier-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-supplier-marquee {
          animation: supplier-marquee 38s linear infinite;
        }
      `}</style>
    </section>
  )
}