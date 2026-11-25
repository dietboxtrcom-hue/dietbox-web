// src/app/kalori-hesaplama/page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import CalorieCalculatorClient from '@/components/CalorieCalculatorClient'
import { ChevronRight, Home } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Günlük Kalori & VKİ Hesaplama | DietBox',
  description:
    'Yaş, boy, kilo ve aktivite düzeyinize göre günlük kalori ihtiyacınızı ve size en uygun DietBox beslenme paketini anında hesaplayın.',
}

export default async function CalorieCalculatorPage() {
  const supabase = await createClient()

  const [pkgRes, menuRes, setRes] = await Promise.all([
    supabase.from('packages').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('navigation_menus').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('system_settings').select('value').eq('key', 'general_settings').single(),
  ])

  const packages = pkgRes.data || []
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

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-2.5">
          <nav className="flex items-center gap-1.5 text-[11px] font-semibold text-white/65">
            <Link href="/" className="hover:text-[#eab130] flex items-center gap-1 transition">
              <Home className="w-3 h-3" />
              Anasayfa
            </Link>
            <ChevronRight className="w-3 h-3 text-white/35" />
            <span className="text-[#eab130] font-bold">Kalori Hesaplama</span>
          </nav>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Günlük Kalori & VKİ Hesaplama
          </h1>
          <p className="text-xs sm:text-sm text-white/75 max-w-2xl">
            Vücut ölçülerinize ve günlük hareket seviyenize göre ideal kalori alımınızı, makro dengenizi ve size en uygun DietBox paketini anında öğrenin.
          </p>
        </div>
      </section>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-10">
        <CalorieCalculatorClient packages={packages} />
      </main>

      <SiteFooter generalSettings={generalSettings} />
    </div>
  )
}