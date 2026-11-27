// src/app/tedarikcilerimiz/page.tsx
import { createAdminClient } from '@/lib/supabase/server'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import PineappleIcon from '@/components/PineappleIcon'
import { ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tedarikçilerimiz | DietBox',
  description: 'DietBox mutfağında kullanılan güvenilir ve sertifikalı gıda tedarikçilerimiz.',
}

export default async function SuppliersPage() {
  const supabase = createAdminClient()

  const [menuRes, setRes, supRes] = await Promise.all([
    supabase.from('navigation_menus').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('system_settings').select('value').eq('key', 'general_settings').single(),
    supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),
  ])

  const suppliers = supRes.data || []

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-between">
      <SiteHeader menus={menuRes.data || []} generalSettings={setRes.data?.value || {}} />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-12">
        <div className="bg-[#0d1f18] text-white rounded-3xl p-8 sm:p-12">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#eab130]">
              <PineappleIcon className="w-4 h-4" />
              Kalite &amp; Gıda Güvenliği
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Mutfağımızın Güvenilir Tedarikçileri
            </h1>
            <p className="text-sm sm:text-base text-white/75 leading-relaxed">
              Her sabah kapınıza ulaşan öğünlerimizde yalnızca Türkiye&apos;nin ve dünyanın lider,
              sertifikalı, soğuk zincir standartlarına uygun markalarının taze ürünlerini kullanıyoruz.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-300 bg-white/10 border border-white/15 px-4 py-2 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              %100 Faturalı, İzlenebilir ve Günlük Taze Hammadde
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {suppliers.map((sup) => (
            <div
              key={sup.id}
              className="group bg-white rounded-3xl border border-slate-200/80 hover:border-[#51a885] p-6 flex flex-col items-center justify-between text-center gap-4 shadow-2xs hover:shadow-[0_18px_40px_rgba(81,168,133,0.14)] hover:-translate-y-1.5 transition-all duration-300"
            >
              <div className="h-20 w-full flex items-center justify-center p-2">
                <img
                  src={sup.logo_url}
                  alt={sup.name}
                  className="max-h-16 max-w-full object-contain group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <div className="space-y-1 border-t border-slate-100 pt-3 w-full">
                <h2 className="text-sm font-extrabold text-slate-900 group-hover:text-[#51a885] transition">
                  {sup.name}
                </h2>
                {sup.category && (
                  <span className="block text-[11px] font-medium text-slate-500">
                    {sup.category}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <SiteFooter generalSettings={setRes.data?.value || {}} />
    </div>
  )
}