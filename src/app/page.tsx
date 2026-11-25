// src/app/page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/components/SiteHeader'
import HeroSlider from '@/components/HeroSlider'
import PackageCarousel from '@/components/PackageCarousel'
import CalorieWizard from '@/components/CalorieWizard'
import SiteFooter from '@/components/SiteFooter'
import {
  Utensils,
  CalendarCheck,
  Truck,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()

  const [pkgRes, menuRes, setRes, slideRes] = await Promise.all([
    supabase.from('packages').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('navigation_menus').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('system_settings').select('value').eq('key', 'general_settings').single(),
    supabase.from('sliders').select('*').eq('is_active', true).order('sort_order'),
  ])

  const packageList = pkgRes.data || []
  const menus = menuRes.data || []
  const generalSettings = setRes.data?.value || {}
  const slides = slideRes.data || []

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Üst Menü */}
      <SiteHeader menus={menus} generalSettings={generalSettings} />

      {/* %100 Tam Ekran Hero Slider */}
      <HeroSlider slides={slides} />

      {/* Sayfa Ana İçeriği */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6">
        {/* Kurumsal Rakamlar & Güven Bandı */}
        <section className="my-10 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-[0_15px_40px_rgba(0,0,0,0.03)] grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#51a885]/12 text-[#51a885] flex items-center justify-center shrink-0">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900 block">21 Özel</span>
              <span className="text-xs font-semibold text-slate-500">Diyet & Detoks Paketi</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#eab130]/20 text-amber-800 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900 block">39 İlçe</span>
              <span className="text-xs font-semibold text-slate-500">Sabah 06:00-09:30 Kurye</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#51a885]/12 text-[#51a885] flex items-center justify-center shrink-0">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900 block">%100 Esnek</span>
              <span className="text-xs font-semibold text-slate-500">Takvim & Gün Dondurma</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#eab130]/20 text-amber-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900 block">0 Katkı</span>
              <span className="text-xs font-semibold text-slate-500">Günlük Taze Üretim</span>
            </div>
          </div>
        </section>

        {/* 3'lü Lüks Paket Carousel */}
        <PackageCarousel packages={packageList} />

        {/* 4 Adımda DietBox Sistemi */}
        <section className="my-14 bg-gradient-to-br from-[#0d1f18] via-[#132c22] to-[#0d1f18] text-white rounded-[2.25rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl space-y-2 mb-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-[#eab130]">
              <Sparkles className="w-4 h-4" />
              Zahmetsiz Sağlıklı Yaşam
            </span>
            <h2 className="text-2xl sm:text-4xl font-black">
              4 Adımda DietBox Sistemi Nasıl Çalışır?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Paketinizi & Kalorinizi Seçin',
                desc: '21 farklı diyet ve detoks programından hedefinize uygun olanı veya Kalori Sihirbazı önerimizi seçin.',
              },
              {
                step: '02',
                title: 'Mahallenizi & Günü Belirleyin',
                desc: '5, 10, 14, 20 veya 30 günlük periyodunuzu ve teslimat mahallenizi seçerek başlangıç gününüzü işaretleyin.',
              },
              {
                step: '03',
                title: 'Gece Taze Mutfak Üretimi',
                desc: 'Öğünleriniz diyetisyen kontrolünde, 1. sınıf malzemelerle gece taze olarak hazırlanıp mühürlenir.',
              },
              {
                step: '04',
                title: 'Her Sabah Kapınıza Teslim',
                desc: 'Sabah 06:00 - 09:30 arasında soğuk zincir araçlarımızla ev veya ofis adresinize teslim edilir.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl p-6 space-y-3 transition"
              >
                <span className="inline-block bg-[#eab130] text-slate-950 font-black text-sm px-3 py-1 rounded-xl">
                  ADIM {item.step}
                </span>
                <h3 className="text-lg font-extrabold text-white">{item.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-[#eab130]" />
              <span>
                Cumartesi günleri hem Cumartesi hem Pazar paketleriniz (farklı menülerle) birlikte teslim edilir.
              </span>
            </div>
            <Link
              href="/fiyatlarimiz"
              className="inline-flex items-center gap-2 bg-[#51a885] hover:bg-[#3b8265] text-white text-xs font-extrabold px-5 py-3 rounded-xl transition"
            >
              Tüm Paket Fiyatlarını Karşılaştır
              <ArrowRight className="w-4 h-4 text-[#eab130]" />
            </Link>
          </div>
        </section>

        {/* İnteraktif VKİ / Kalori Sihirbazı */}
        <CalorieWizard packages={packageList} />
      </main>

      {/* Footer & Yüzen Butonlar */}
      <SiteFooter generalSettings={generalSettings} />
    </div>
  )
}