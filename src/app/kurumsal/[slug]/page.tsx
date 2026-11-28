// src/app/kurumsal/[slug]/page.tsx
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { ChevronRight, Home, ArrowRight, HelpCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: page } = await supabase
    .from('corporate_pages')
    .select('title, subtitle, meta_title, meta_description')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!page) {
    return { title: 'Sayfa Bulunamadı | DietBox' }
  }

  const title = (page.meta_title || '').trim() || `${page.title} | DietBox`
  const description =
    (page.meta_description || '').trim() ||
    (page.subtitle || '').trim() ||
    `${page.title} - DietBox adrese teslim diyet yemekleri servisi.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  }
}

export default async function CorporatePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (slug === 'sikca-sorulan-sorular') redirect('/sikca-sorulan-sorular')

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

      {/* İnce, Şık & Flu Arka Planlı Editorial Breadcrumb Başlık Bandı */}
      <section className="relative w-full overflow-hidden border-b border-slate-200/80 bg-[#0d1f18]">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 blur-[4px] opacity-30"
          style={{
            backgroundImage:
              "url('https://www.dietboxtr.com/wp-content/uploads/2020/07/dietbox-19.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1f18]/92 via-[#0d1f18]/80 to-[#0d1f18]/70" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-2.5">
          <nav className="flex items-center flex-wrap gap-1.5 text-[11px] font-semibold text-white/65">
            <Link href="/" className="hover:text-[#eab130] flex items-center gap-1 transition">
              <Home className="w-3 h-3" />
              Anasayfa
            </Link>
            <ChevronRight className="w-3 h-3 text-white/35" />
            <span>Kurumsal</span>
            <ChevronRight className="w-3 h-3 text-white/35" />
            <span className="text-[#eab130] font-bold">{page.title}</span>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {page.title}
              </h1>
              {page.subtitle && (
                <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                  {page.subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sol Menü + Sağ İçerik */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <aside className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1.5 lg:sticky lg:top-24">
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-3 pb-2.5 mb-1 border-b border-slate-100">
              Kurumsal & Yasal
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

            <Link
              href="/sikca-sorulan-sorular"
              className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#51a885] transition"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#eab130]" />
                Sıkça Sorulan Sorular
              </span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </Link>

            <div className="pt-4 mt-3 border-t border-slate-100">
              <Link
                href="/paketler"
                className="w-full bg-[#0d1f18] hover:bg-[#51a885] text-white font-bold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition"
              >
                <span>Diyet Paketlerini İncele</span>
                <ArrowRight className="w-4 h-4 text-[#eab130]" />
              </Link>
            </div>
          </aside>

          <article className="lg:col-span-8 bg-white rounded-3xl p-7 sm:p-10 border border-slate-200/80 shadow-xs">
            {/<[a-z][\s\S]*>/i.test(page.content || '') ? (
              <div
                className="text-sm sm:text-base leading-relaxed text-slate-700 [&_h2]:text-xl sm:[&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-slate-900 [&_h2]:mt-6 first:[&_h2]:mt-0 [&_h2]:mb-3 [&_h3]:text-base sm:[&_h3]:text-lg [&_h3]:font-extrabold [&_h3]:text-[#0d1f18] [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-2 [&_a]:text-[#51a885] [&_a]:font-bold [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-[#eab130] [&_blockquote]:bg-[#f8faf9] [&_blockquote]:p-4 [&_blockquote]:rounded-r-2xl [&_blockquote]:italic [&_blockquote]:text-slate-700 [&_blockquote]:my-5 [&_img]:rounded-2xl [&_img]:my-4 [&_img]:max-w-full"
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