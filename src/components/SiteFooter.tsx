// src/components/SiteFooter.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Mail,
  Phone,
  MapPin,
  ArrowUp,
  MessageCircle,
  ShieldCheck,
  ChevronRight,
  Send,
  Award,
} from 'lucide-react'

const SUPPLIERS = [
  { name: 'alpro', sub: 'Bitkisel Süt Ürünleri', accent: 'border-blue-200 text-blue-800' },
  { name: 'Sinangil', sub: 'Tam Tahıl & Glutensiz', accent: 'border-red-200 text-red-700' },
  { name: 'MARMARABİRLİK', sub: 'Doğal Zeytin & Zeytinyağı', accent: 'border-emerald-200 text-emerald-800' },
  { name: 'ÖNCÜ', sub: 'Doğal Yöresel Ürünler', accent: 'border-amber-200 text-amber-800' },
  { name: 'ALTINKILIÇ', sub: 'Kefir & Doğal Süt Ürünleri', accent: 'border-rose-200 text-rose-700' },
  { name: 'Barilla', sub: 'Tam Buğday & Protein Makarna', accent: 'border-indigo-200 text-indigo-800' },
  { name: 'doğadan', sub: 'Fonksiyonel Bitki Çayları', accent: 'border-green-200 text-green-800' },
]

export default function SiteFooter({ generalSettings }: { generalSettings?: any }) {
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const phoneRaw = generalSettings?.phone || '0 216 367 24 13'
  const phoneDial = phoneRaw.replace(/\s+/g, '')
  const whatsappRaw = (generalSettings?.whatsapp || '905421482021').replace(/\D/g, '')
  const whatsappMsg = encodeURIComponent(
    generalSettings?.whatsapp_message ||
      'Merhaba DietBox, diyet paketleriniz hakkında bilgi almak istiyorum.'
  )

  const scrollingSuppliers = [...SUPPLIERS, ...SUPPLIERS]

  return (
    <div className="mt-20">
      {/* 1. SONSUZ KAYAN (MARQUEE) TEDARİKÇİLERİMİZ BANDI */}
      <section className="bg-white border-y border-slate-200/90 py-12 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#51a885] mb-1">
              <Award className="w-4 h-4 text-[#eab130]" />
              1. Sınıf Mutfak Kalitesi
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">Tedarikçilerimiz</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Sizlere en kaliteli yemekleri sunabilmek için Türkiye&apos;nin en güvenilir markalarıyla çalışıyoruz.
            </p>
          </div>
        </div>

        <div className="relative w-full overflow-hidden">
          <div className="animate-marquee gap-5 px-4">
            {scrollingSuppliers.map((s, idx) => (
              <div
                key={idx}
                className={`w-56 shrink-0 bg-slate-50/80 hover:bg-white p-6 rounded-2xl border ${s.accent} shadow-2xs hover:shadow-md transition flex flex-col items-center justify-center text-center`}
              >
                <span className="font-black text-xl tracking-tight">{s.name}</span>
                <span className="text-[11px] text-slate-500 font-semibold mt-1">{s.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. HABER BÜLTENİ ABONELİK ŞERİDİ */}
      <section className="bg-gradient-to-r from-[#51a885] to-[#3b8265] text-white py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-[#eab130] shrink-0">
              <Mail className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-black text-white text-lg sm:text-xl">
                Haber Bültenimize Abone Olun
              </h4>
              <p className="text-xs sm:text-sm text-white/85">
                Etkinlikler, yeni detoks kampları ve indirim fırsatlarından ilk siz haberdar olun.
              </p>
            </div>
          </div>

          {subscribed ? (
            <div className="bg-white text-[#0d1f18] px-6 py-3.5 rounded-2xl text-xs font-black shadow-lg">
              ✓ Bültenimize başarıyla kayıt oldunuz!
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setSubscribed(true)
                setNewsletterEmail('')
              }}
              className="flex w-full md:w-auto gap-2.5"
            >
              <input
                type="email"
                required
                placeholder="E-posta Adresiniz..."
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="flex-1 md:w-80 bg-white text-slate-900 rounded-2xl px-4 py-3.5 text-xs font-semibold focus:outline-none shadow-inner"
              />
              <button
                type="submit"
                className="bg-[#eab130] hover:bg-[#d49b1a] text-slate-950 font-black text-xs px-6 py-3.5 rounded-2xl transition cursor-pointer flex items-center gap-2 shrink-0 shadow-lg"
              >
                <Send className="w-4 h-4" />
                ABONE OL!
              </button>
            </form>
          )}
        </div>
      </section>

      {/* 3. KOYU ZÜMRÜT KURUMSAL FOOTER */}
      <footer className="bg-[#0d1f18] text-slate-300 pt-16 pb-10 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 pb-12 border-b border-white/10">
          {/* Sütun 1: Logo & Firma Bilgileri */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white inline-block p-3 rounded-2xl shadow-md">
              <img
                src="/images/logo/diet-box-logo.png"
                alt="DietBox Logo"
                className="h-11 w-auto object-contain"
              />
            </div>
            <p className="text-xs text-slate-300/80 leading-relaxed">
              {generalSettings?.footer_about ||
                'Diet Box taze ve besleyici gıda sağlayan, güvenilir kapıda teslimat hizmeti veren kendini sağlıklı beslenme konusunda geliştirmiş bir firmadır.'}
            </p>
            <div className="space-y-2 text-xs text-slate-300 pt-1">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#eab130] shrink-0 mt-0.5" />
                <span>
                  {generalSettings?.address ||
                    'Aydınevler Mah. Kırçiçeği Cd. 34854 Maltepe / İstanbul'}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#51a885] shrink-0" />
                <a href={`tel:${phoneDial}`} className="font-bold text-white hover:text-[#eab130]">
                  {phoneRaw}
                </a>
              </p>
            </div>
          </div>

          {/* Sütun 2: Kurumsal */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-white font-black text-sm uppercase tracking-wider border-l-4 border-[#eab130] pl-3">
              KURUMSAL
            </h4>
            <ul className="space-y-2.5 text-xs divide-y divide-white/10">
              <li className="pt-2.5 first:pt-0">
                <Link href="/kurumsal/hakkimizda" className="hover:text-[#eab130] flex items-center gap-1.5 transition">
                  <ChevronRight className="w-3.5 h-3.5 text-[#51a885]" /> Hakkımızda
                </Link>
              </li>
              <li className="pt-2.5">
                <Link href="/kurumsal/misyon-vizyon" className="hover:text-[#eab130] flex items-center gap-1.5 transition">
                  <ChevronRight className="w-3.5 h-3.5 text-[#51a885]" /> Misyon & Vizyon
                </Link>
              </li>
              <li className="pt-2.5">
                <Link href="/kurumsal/teslimat-bilgisi" className="hover:text-[#eab130] flex items-center gap-1.5 transition">
                  <ChevronRight className="w-3.5 h-3.5 text-[#51a885]" /> Teslimat Bilgisi
                </Link>
              </li>
              <li className="pt-2.5">
                <Link href="/sikca-sorulan-sorular" className="hover:text-[#eab130] flex items-center gap-1.5 transition">
                  <ChevronRight className="w-3.5 h-3.5 text-[#51a885]" /> Sıkça Sorulan Sorular
                </Link>
              </li>
              <li className="pt-2.5">
                <Link href="/iletisim" className="hover:text-[#eab130] flex items-center gap-1.5 transition">
                  <ChevronRight className="w-3.5 h-3.5 text-[#51a885]" /> İletişim
                </Link>
              </li>
            </ul>
          </div>

          {/* Sütun 3: Yasal & Sözleşmeler */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-white font-black text-sm uppercase tracking-wider border-l-4 border-[#51a885] pl-3">
              YASAL & SÖZLEŞMELER
            </h4>
            <ul className="space-y-2.5 text-xs divide-y divide-white/10">
              <li className="pt-2.5 first:pt-0">
                <Link
                  href="/kurumsal/mesafeli-satis-sozlesmesi"
                  className="hover:text-[#eab130] flex items-center gap-1.5 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#51a885]" /> Mesafeli Satış Sözleşmesi
                </Link>
              </li>
              <li className="pt-2.5">
                <Link
                  href="/kurumsal/kvkk"
                  className="hover:text-[#eab130] flex items-center gap-1.5 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#51a885]" /> KVKK Aydınlatma Metni
                </Link>
              </li>
              <li className="pt-2.5">
                <Link
                  href="/kurumsal/cerez-politikasi"
                  className="hover:text-[#eab130] flex items-center gap-1.5 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#51a885]" /> Çerez (Cookie) Politikası
                </Link>
              </li>
              <li className="pt-2.5">
                <Link
                  href="/kurumsal/iptal-ve-iade-kosullari"
                  className="hover:text-[#eab130] flex items-center gap-1.5 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#51a885]" /> İptal, İade & Gün Dondurma
                </Link>
              </li>
              <li className="pt-2.5">
                <Link
                  href="/hesabim"
                  className="hover:text-[#eab130] flex items-center gap-1.5 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#51a885]" /> Paket Takibi & Hesabım
                </Link>
              </li>
            </ul>
          </div>

          {/* Sütun 4: Popüler Paketler */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-white font-black text-sm uppercase tracking-wider border-l-4 border-[#eab130] pl-3">
              PAKETLERİMİZ
            </h4>
            <ul className="space-y-2.5 text-xs divide-y divide-white/10">
              <li className="pt-2.5 first:pt-0">
                <Link
                  href="/paketler/zayiflama-ve-dengeli-beslenme-paketi"
                  className="hover:text-[#eab130] flex items-center gap-1.5 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#51a885]" /> Zayıflama & Dengeli
                </Link>
              </li>
              <li className="pt-2.5">
                <Link
                  href="/paketler/intermittent-fasting-aralikli-oruc"
                  className="hover:text-[#eab130] flex items-center gap-1.5 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#51a885]" /> Intermittent Fasting
                </Link>
              </li>
              <li className="pt-2.5">
                <Link
                  href="/paketler/21-gunluk-diyet-detoks-paketi"
                  className="hover:text-[#eab130] flex items-center gap-1.5 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#51a885]" /> 21 Günlük Detoks
                </Link>
              </li>
              <li className="pt-2.5">
                <Link
                  href="/paketler/sporcu-beslenme-paketi"
                  className="hover:text-[#eab130] flex items-center gap-1.5 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#51a885]" /> Sporcu Beslenme
                </Link>
              </li>
              <li className="pt-2.5">
                <Link
                  href="/fiyatlarimiz"
                  className="text-[#eab130] font-extrabold flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#eab130]" /> Şeffaf Fiyat Tablosu
                </Link>
              </li>
            </ul>
          </div>

          {/* Sütun 5: Sosyal Medya & Güvenli Ödeme */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h4 className="text-white font-black text-sm uppercase tracking-wider mb-3">
                SOSYAL MEDYA
              </h4>
              <div className="flex items-center gap-3">
                <a
                  href={generalSettings?.facebook_url || 'https://www.facebook.com/dietboxtr/'}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-[#51a885] text-white flex items-center justify-center font-black transition"
                >
                  f
                </a>
                <a
                  href={generalSettings?.instagram_url || 'https://www.instagram.com/dietboxtr/'}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-[#eab130] hover:text-slate-950 text-white flex items-center justify-center font-black transition"
                >
                  IG
                </a>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <h4 className="text-white font-black text-sm uppercase tracking-wider">
                GÜVENLİ ÖDEME
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-lg text-xs font-black text-blue-300">
                  VISA
                </span>
                <span className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-lg text-xs font-black text-[#eab130]">
                  MasterCard
                </span>
                <span className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-lg text-xs font-black text-sky-300">
                  TROY
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-[#51a885] font-bold pt-1">
                <ShieldCheck className="w-4 h-4 text-[#eab130]" />
                256Bit SSL & 3D Secure
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 text-center space-y-1.5 text-xs text-slate-400">
          <p className="text-slate-300 font-semibold">
            Mesa Tüketim Maddeleri Gıda İnşaat Enerji San. ve Ticaret Ltd. Şti.
          </p>
          <p>{generalSettings?.footer_copyright || 'Diet Box. © 2026. Her Hakkı Saklıdır.'}</p>
          <p>
            Web Tasarım{' '}
            <a
              href="https://www.eladesign.org"
              target="_blank"
              rel="noreferrer"
              className="text-[#eab130] font-extrabold hover:underline"
            >
              Ela Design
            </a>
          </p>
        </div>
      </footer>

      {/* 4. YÜZEN BUTONLAR: YUKARI ÇIK + HEMEN ARA + WHATSAPP */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2.5 print:hidden">
        {showScrollTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            title="Yukarı Çık"
            className="w-11 h-11 rounded-2xl bg-[#0d1f18] hover:bg-[#51a885] text-white shadow-xl border border-white/15 flex items-center justify-center transition cursor-pointer"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}

        <a
          href={`tel:${phoneDial}`}
          className="bg-[#0d1f18] hover:bg-slate-900 text-white px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 text-xs font-extrabold border border-[#eab130]/40 transition hover:-translate-y-0.5"
        >
          <Phone className="w-4 h-4 text-[#eab130]" />
          <span>Hemen Ara: {phoneRaw}</span>
        </a>

        <a
          href={`https://wa.me/${whatsappRaw}?text=${whatsappMsg}`}
          target="_blank"
          rel="noreferrer"
          className="bg-gradient-to-r from-[#51a885] to-[#3b8265] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-black border border-white/25 transition hover:scale-105"
        >
          <MessageCircle className="w-4 h-4 text-[#eab130]" />
          <span>WhatsApp Destek 🍍</span>
        </a>
      </div>
    </div>
  )
}