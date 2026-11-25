// src/components/CookieConsent.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Cookie, ShieldCheck, SlidersHorizontal, X, Check } from 'lucide-react'

const STORAGE_KEY = 'dietbox_cookie_consent_v1'

export default function CookieConsent() {
  const pathname = usePathname()
  const isHiddenRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/kurye')
  const [visible, setVisible] = useState(false)
  const [showPrefs, setShowPrefs] = useState(false)
  const [analytics, setAnalytics] = useState(true)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const saveConsent = (prefs: { necessary: boolean; analytics: boolean; marketing: boolean }) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...prefs, savedAt: new Date().toISOString() })
    )
    setVisible(false)
    setShowPrefs(false)
  }

  if (!visible || isHiddenRoute) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-lg z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-[#0d1f18]/95 backdrop-blur-xl text-white rounded-3xl p-5 sm:p-6 border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.35)] space-y-4">
        {/* Üst Başlık */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eab130]/20 border border-[#eab130]/40 text-[#eab130] flex items-center justify-center shrink-0">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black tracking-tight text-white">
                Çerez Tercihleriniz
              </h4>
              <span className="text-[11px] text-white/60">
                Mesa Tüketim Maddeleri Ltd. Şti. • KVKK Uyumlu
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => saveConsent({ necessary: true, analytics: false, marketing: false })}
            aria-label="Sadece zorunlu çerezlerle kapat"
            className="text-white/50 hover:text-white p-1 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Açıklama */}
        <p className="text-xs text-white/80 leading-relaxed">
          Size kesintisiz ve güvenli bir sipariş deneyimi sunmak için zorunlu çerezler kullanıyoruz.
          İsteğe bağlı analitik ve kişiselleştirme çerezlerini aşağıdan yönetebilir veya{' '}
          <Link
            href="/kurumsal/cerez-politikasi"
            className="text-[#eab130] underline font-bold hover:text-white"
          >
            Çerez Politikamızı
          </Link>{' '}
          inceleyebilirsiniz.
        </p>

        {/* Detaylı Tercih Paneli */}
        {showPrefs && (
          <div className="space-y-2.5 pt-2 border-t border-white/10">
            {/* Zorunlu Çerezler */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#51a885]" />
                  <span className="text-xs font-bold text-white">Zorunlu Çerezler</span>
                </div>
                <p className="text-[11px] text-white/60 mt-0.5">
                  Oturum, sepet ve ödeme güvenliği için gereklidir (kapatılamaz).
                </p>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#51a885]/25 text-[#51a885] px-2.5 py-1 rounded-full shrink-0">
                Her Zaman Aktif
              </span>
            </div>

            {/* Analitik Çerezler */}
            <label className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/10 transition">
              <div>
                <span className="text-xs font-bold text-white block">
                  Analitik & Performans Çerezleri
                </span>
                <p className="text-[11px] text-white/60 mt-0.5">
                  Hangi paketlerin ilgi gördüğünü anonim olarak ölçmemizi sağlar.
                </p>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="w-4 h-4 accent-[#51a885] shrink-0 cursor-pointer"
              />
            </label>

            {/* Pazarlama Çerezleri */}
            <label className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/10 transition">
              <div>
                <span className="text-xs font-bold text-white block">
                  Pazarlama & Kişiselleştirme Çerezleri
                </span>
                <p className="text-[11px] text-white/60 mt-0.5">
                  Size özel kampanya ve diyet paketi duyuruları için kullanılır.
                </p>
              </div>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="w-4 h-4 accent-[#51a885] shrink-0 cursor-pointer"
              />
            </label>
          </div>
        )}

        {/* Aksiyon Butonları */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => saveConsent({ necessary: true, analytics: true, marketing: true })}
            className="flex-1 bg-[#51a885] hover:bg-[#3f8d6d] text-white text-xs font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Tümünü Kabul Et
          </button>

          {showPrefs ? (
            <button
              type="button"
              onClick={() => saveConsent({ necessary: true, analytics, marketing })}
              className="flex-1 bg-[#eab130] hover:bg-[#d49b1a] text-slate-950 text-xs font-extrabold py-2.5 px-4 rounded-xl transition cursor-pointer"
            >
              Tercihlerimi Kaydet
            </button>
          ) : (
            <button
              type="button"
              onClick={() => saveConsent({ necessary: true, analytics: false, marketing: false })}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 px-3.5 rounded-xl transition cursor-pointer"
            >
              Sadece Zorunlu
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPrefs((p) => !p)}
            className="bg-transparent hover:bg-white/10 border border-white/20 text-white/85 text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#eab130]" />
            {showPrefs ? 'Gizle' : 'Ayarlar'}
          </button>
        </div>
      </div>
    </div>
  )
}