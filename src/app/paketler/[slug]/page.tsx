// src/app/paketler/[slug]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/components/SiteHeader'
import PackageConfigurator from '@/components/PackageConfigurator'
import { formatTRY } from '@/lib/pricing-engine'
import { Flame, Dumbbell, UtensilsCrossed, ArrowLeft, ShieldCheck } from 'lucide-react'

export const instant = false

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PackageDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const [
    pkgRes,
    durationsRes,
    citiesRes,
    districtsRes,
    neighborhoodsRes,
    addonsRes,
    menuRes,
    setRes,
  ] = await Promise.all([
    supabase.from('packages').select('*').eq('slug', slug).eq('is_active', true).single(),
    supabase.from('package_durations').select('*').eq('is_active', true).order('days'),
    supabase.from('cities').select('*').eq('is_active', true).order('id'),
    supabase.from('districts').select('*').eq('is_active', true).order('name'),
    supabase.from('neighborhoods').select('*').eq('is_active', true).order('name').limit(2000),
    supabase.from('addon_products').select('*').eq('is_active', true),
    supabase.from('navigation_menus').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('system_settings').select('value').eq('key', 'general_settings').single(),
  ])

  if (!pkgRes.data) {
    notFound()
  }

  const pkg = pkgRes.data

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader menus={menuRes.data || []} generalSettings={setRes.data?.value || {}} />

      <main className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <Link
              href="/paketler"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Tüm Diyet Paketlerine Dön
            </Link>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              Her Sabah Taze Teslimat
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-slate-200 shadow-lg border border-slate-200">
                <img
                  src={
                    pkg.cover_image ||
                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=80'
                  }
                  alt={pkg.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h1 className="text-2xl font-extrabold text-slate-900">{pkg.title}</h1>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-emerald-600">
                    {formatTRY(pkg.daily_base_price)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    &apos;den başlayan günlük fiyatlarla
                  </span>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {(pkg.short_description || '').replace(/\\n/g, ' ')}
                </p>

                <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                  {(pkg.full_description || '').replace(/\\n/g, ' ')}
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <Flame className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                    <span className="block text-[11px] text-slate-400">Kalori</span>
                    <span className="text-xs font-bold text-slate-800">{pkg.calories_range}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <UtensilsCrossed className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <span className="block text-[11px] text-slate-400">Öğün Sayısı</span>
                    <span className="text-xs font-bold text-slate-800">{pkg.meal_count_text}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <Dumbbell className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                    <span className="block text-[11px] text-slate-400">İçerik</span>
                    <span className="text-xs font-bold text-slate-800 line-clamp-1">
                      {pkg.protein_info}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Diyetisyen kontrolünde günlük taze üretilir, koruyucu veya katkı maddesi içermez.
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <Suspense fallback={<div className="p-8 bg-white rounded-2xl">Yükleniyor...</div>}>
                <PackageConfigurator
                  pkg={pkg}
                  durations={durationsRes.data || []}
                  cities={citiesRes.data || []}
                  districts={districtsRes.data || []}
                  neighborhoods={neighborhoodsRes.data || []}
                  addons={addonsRes.data || []}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}