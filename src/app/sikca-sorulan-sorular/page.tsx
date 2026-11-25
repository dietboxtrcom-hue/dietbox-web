// src/app/sikca-sorulan-sorular/page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import FaqAccordion from '@/components/FaqAccordion'
import { ChevronRight, Home, MessageCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function FaqPage() {
  const supabase = await createClient()

  const [faqRes, menuRes, setRes] = await Promise.all([
    supabase.from('faqs').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('navigation_menus').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('system_settings').select('value').eq('key', 'general_settings').single(),
  ])

  const faqs = faqRes.data || []
  const menus = menuRes.data || []
  const generalSettings = setRes.data?.value || {}

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-between">
      <SiteHeader menus={menus} generalSettings={generalSettings} />

      {/* İnce & Flu Arka Planlı Editorial Breadcrumb Başlık */}
      <section className="relative w-full overflow-hidden border-b border-slate-200/80 bg-[#0d1f18]">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 blur-[4px] opacity-30"
          style={{
            backgroundImage:
              "url('https://www.dietboxtr.com/wp-content/uploads/2020/07/dietbox-19.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1f18]/92 via-[#0d1f18]/80 to-[#0d1f18]/70" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-2.5">
          <nav className="flex items-center gap-1.5 text-[11px] font-semibold text-white/65">
            <Link href="/" className="hover:text-[#eab130] flex items-center gap-1 transition">
              <Home className="w-3 h-3" />
              Anasayfa
            </Link>
            <ChevronRight className="w-3 h-3 text-white/35" />
            <span className="text-[#eab130] font-bold">Sıkça Sorulan Sorular</span>
          </nav>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Sıkça Sorulan Sorular
          </h1>
          <p className="text-xs sm:text-sm text-white/75 max-w-2xl">
            Diyet paketlerimiz, sabah soğuk zincir teslimatı, gün dondurma ve ödeme süreçleri hakkında tüm merak ettikleriniz.
          </p>
        </div>
      </section>

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        <FaqAccordion faqs={faqs} />

        {/* Alt Hızlı Destek Kutusu */}
        <div className="bg-[#0d1f18] text-white rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black">Aradığınız cevabı bulamadınız mı?</h3>
            <p className="text-xs text-white/75">
              Diyetisyen ve müşteri destek ekibimiz size yardımcı olmaktan mutluluk duyar.
            </p>
          </div>
          <Link
            href="/iletisim"
            className="bg-[#51a885] hover:bg-[#3f8d6d] text-white font-bold text-xs px-6 py-3.5 rounded-full flex items-center gap-2 transition"
          >
            <MessageCircle className="w-4 h-4 text-[#eab130]" />
            Bize Ulaşın
          </Link>
        </div>
      </main>

      <SiteFooter generalSettings={generalSettings} />
    </div>
  )
}