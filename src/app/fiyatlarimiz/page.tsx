// src/app/fiyatlarimiz/page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { formatTRY } from '@/lib/pricing-engine'
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'

export const instant = false

export default async function PricingTablePage() {
  const supabase = await createClient()

  const [pkgRes, menuRes, setRes] = await Promise.all([
    supabase.from('packages').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('navigation_menus').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('system_settings').select('value').eq('key', 'general_settings').single(),
  ])

  const packages = pkgRes.data || []
  const generalSettings = setRes.data?.value || {}

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <SiteHeader menus={menuRes.data || []} generalSettings={generalSettings} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="bg-gradient-to-r from-emerald-950 to-slate-900 text-white rounded-3xl p-8 sm:p-10 space-y-3 shadow-lg">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            Şeffaf & Kademeli Fiyat Tablosu
          </span>
          <h1 className="text-2xl sm:text-4xl font-black">
            Diyet ve Detoks Paket Fiyatlarımız
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
            Paket gün sayınız arttıkça günlük birim maliyetiniz düşer. Tüm fiyatlarımıza KDV ve standart teslimat bölgelerimiz için sabah kurye hizmeti dahildir.
          </p>
        </div>

        {/* Paketlerin Gün Sayısına Göre Karşılaştırma Listesi */}
        <div className="space-y-4">
          {packages.map((pkg) => {
            const tiers = Array.isArray(pkg.custom_duration_prices)
              ? pkg.custom_duration_prices
              : []

            return (
              <div
                key={pkg.id}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs hover:shadow-md transition space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        pkg.cover_image ||
                        'https://www.dietboxtr.com/wp-content/uploads/2020/07/dietbox-19.jpg'
                      }
                      alt={pkg.title}
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded">
                        {pkg.category}
                      </span>
                      <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                        {pkg.title}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {pkg.meal_count_text} • {pkg.calories_range}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/paketler/${pkg.slug}`}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-5 py-3 rounded-xl flex items-center gap-2 transition"
                  >
                    Paketi Seç & Mahalle Hesapla
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Periyot Kartları */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {tiers.map((tier: any, idx: number) => {
                    const daily =
                      tier.daily_display ||
                      Math.round(Number(tier.total_price) / Math.max(1, Number(tier.days)))

                    return (
                      <Link
                        key={idx}
                        href={`/paketler/${pkg.slug}`}
                        className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-400 transition flex flex-col justify-between"
                      >
                        <div>
                          <span className="text-xs font-extrabold text-slate-800 block">
                            {tier.label || `${tier.days} Günlük Paket`}
                          </span>
                          <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
                            Günlük: {formatTRY(daily)}
                          </span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-slate-200/70 flex items-baseline justify-between">
                          <span className="text-[10px] text-slate-400 font-semibold">Toplam:</span>
                          <span className="text-base font-black text-slate-900">
                            {formatTRY(tier.total_price)}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Tuzla, Beykoz, Çekmeköy ve Büyükçekmece gibi uzak mesafe ilçelerde mahalle bazlı lojistik farkı paket sayfasında otomatik hesaplanır.
            </span>
          </div>
          <Link href="/iletisim" className="text-emerald-700 font-extrabold hover:underline">
            Kurumsal & Toplu Sipariş Teklifi Al &rarr;
          </Link>
        </div>
      </main>

      <SiteFooter generalSettings={generalSettings} />
    </div>
  )
}