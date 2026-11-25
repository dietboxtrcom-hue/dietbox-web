// src/app/paketler/page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/components/SiteHeader'
import { formatTRY } from '@/lib/pricing-engine'
import { Flame, ArrowRight } from 'lucide-react'

export const instant = false

export default async function AllPackagesPage() {
  const supabase = await createClient()

  const [pkgRes, menuRes, setRes] = await Promise.all([
    supabase.from('packages').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('navigation_menus').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('system_settings').select('value').eq('key', 'general_settings').single(),
  ])

  const packages = pkgRes.data || []

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader menus={menuRes.data || []} generalSettings={setRes.data?.value || {}} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Tüm Diyet ve Detoks Paketlerimiz</h1>
          <p className="text-sm text-slate-500 mt-1">
            Hedefinize uygun paketi seçerek mahalle teslimat saatlerini ve gün seçeneklerini inceleyebilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition flex flex-col"
            >
              <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden">
                <img
                  src={
                    pkg.cover_image ||
                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
                  }
                  alt={pkg.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-3 left-3 bg-slate-900/80 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  {pkg.category || 'Diyet Paketi'}
                </span>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <h2 className="text-lg font-extrabold text-slate-900">{pkg.title}</h2>
                  <p className="text-xs text-slate-600 line-clamp-3">
                    {(pkg.short_description || '').replace(/\\n/g, ' ')}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] text-slate-400">Günlük Başlangıç</span>
                    <span className="text-xl font-extrabold text-slate-900">
                      {formatTRY(pkg.daily_base_price)}
                    </span>
                  </div>

                  <Link
                    href={`/paketler/${pkg.slug}`}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-3 rounded-xl transition flex items-center gap-1.5"
                  >
                    İncele & Seç
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}