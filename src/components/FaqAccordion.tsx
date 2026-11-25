// src/components/FaqAccordion.tsx
'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, Search, Sparkles } from 'lucide-react'

interface FaqItem {
  id: number
  category: string
  question: string
  answer: string
}

export default function FaqAccordion({ faqs = [] }: { faqs?: FaqItem[] }) {
  const categories = useMemo(() => {
    const set = new Set<string>(['Tümü'])
    faqs.forEach((f) => set.add(f.category || 'Genel'))
    return Array.from(set)
  }, [faqs])

  const [selectedCat, setSelectedCat] = useState('Tümü')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<number | null>(faqs[0]?.id ?? null)

  const filtered = useMemo(() => {
    return faqs.filter((f) => {
      const catOk = selectedCat === 'Tümü' || f.category === selectedCat
      const q = query.trim().toLowerCase()
      const searchOk =
        !q ||
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q)
      return catOk && searchOk
    })
  }, [faqs, selectedCat, query])

  return (
    <div className="space-y-6">
      {/* Arama ve Kategori Filtreleri */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Merak ettiğiniz konuyu arayın (ör. dondurma, teslimat saati, alerjen)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-slate-200 focus:border-[#51a885] focus:outline-none rounded-2xl pl-11 pr-4 py-3 text-sm bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCat(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                selectedCat === cat
                  ? 'bg-[#0d1f18] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-[#51a885]/15 hover:text-[#0d1f18]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tıklanabilir Akordiyon Kartları */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center text-sm text-slate-500">
            Aramanızla eşleşen bir soru bulunamadı.
          </div>
        ) : (
          filtered.map((item) => {
            const isOpen = openId === item.id
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'border-[#51a885] shadow-[0_12px_30px_rgba(81,168,133,0.12)]'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="w-full text-left px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#51a885]">
                      <Sparkles className="w-3 h-3 text-[#eab130]" />
                      {item.category}
                    </span>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                      {item.question}
                    </h3>
                  </div>

                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen
                        ? 'bg-[#51a885] text-white rotate-180'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {item.answer}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}