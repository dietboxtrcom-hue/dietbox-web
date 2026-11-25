// src/app/kurumsal/[slug]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { ChevronRight, ShieldCheck, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CorporatePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const [pageRes, allPagesRes, menuRes, setRes] = await Promise.all([
    supabase
      .from('corporate_pages')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single(),
    supabase
      .from('corporate_pages')
      .select('id, slug, title')
      .eq('is_active', true)
      .order('sort_order'),
    supabase.from('navigation_menus').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('system_settings').select('value').eq('key', 'general_settings').single(),
  ])

  const page = pageRes.data
  if (!page) notFound()

  const allPages = allPagesRes.data || []
  const menus = menuRes.data || []
  const generalSettings = setRes.data?.value || {}

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-between">
      <SiteHeader menus={menus} generalSettings={generalSettings} />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
        {/* Üst Başlık Bandı */}
        <div className="bg-[#0d1f18] text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="relative z-10 space-y-2 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#eab130]">
              <ShieldCheck className="w-4 h-4" />
              DietBox Kurumsal
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{page.title}</h1>
            {page.subtitle && (
              <p className="text-sm sm:text-base text-white/80 pt-1">{page.subtitle}</p>
            )}
          </div>
        </div>

        {/* Sol Menü + Sağ İçerik */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <aside className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-3 pb-2 border-b border-slate-100">
              Kurumsal Sayfalar
            </span>
            {allPages.map((item) => {
              const isCurrent = item.slug === page.slug
              return (
                <Link
                  key={item.id}
                  href={`/kurumsal/${item.slug}`}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition ${
                    isCurrent
                      ? 'bg-[#51a885] text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-[#51a885]'
                  }`}
                >
                  <span>{item.title}</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </Link>
              )
            })}

            <div className="pt-4 mt-4 border-t border-slate-100">
              <Link
                href="/paketler"
                className="w-full bg-[#eab130] hover:bg-[#d49b1a] text-slate-950 font-black text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition"
              >
                <span>Diyet Paketlerini İncele</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </aside>

          <article className="lg:col-span-8 bg-white rounded-3xl p-7 sm:p-10 border border-slate-200/80 shadow-xs">
            {/<[a-z][\s\S]*>/i.test(page.content || '') ? (
              <div
                className="text-sm sm:text-base leading-relaxed text-slate-700 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-slate-900 [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-extrabold [&_h3]:text-slate-900 [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-1.5 [&_a]:text-[#51a885] [&_a]:font-bold [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-[#eab130] [&_blockquote]:bg-slate-50 [&_blockquote]:p-4 [&_blockquote]:rounded-r-xl [&_blockquote]:italic [&_blockquote]:my-4 [&_img]:rounded-2xl [&_img]:my-4 [&_img]:max-w-full"
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            ) : (
              <div className="text-sm sm:text-base leading-relaxed text-slate-700 whitespace-pre-line">
                {page.content}
              </div>
            )}
          </article>
        </div>
      </main>

      <SiteFooter generalSettings={generalSettings} />
    </div>
  )
}