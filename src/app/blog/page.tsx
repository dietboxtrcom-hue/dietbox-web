// src/app/blog/page.tsx
import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { ArrowRight, BookOpen, Calendar } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Blog & Sağlıklı Beslenme Rehberi | DietBox',
  description:
    'Diyetisyenlerimizden sağlıklı beslenme, detoks, aralıklı oruç ve sporcu beslenmesi üzerine güncel yazılar.',
}

interface PageProps {
  searchParams: Promise<{ kategori?: string }>
}

export default async function BlogListPage({ searchParams }: PageProps) {
  const { kategori } = await searchParams
  const supabase = createAdminClient()

  const [menuRes, setRes, catsRes, postsRes] = await Promise.all([
    supabase.from('navigation_menus').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('system_settings').select('value').eq('key', 'general_settings').single(),
    supabase.from('blog_categories').select('*').order('sort_order').order('name'),
    supabase
      .from('blog_posts')
      .select('*, blog_categories(id, name, slug)')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
  ])

  const categories = catsRes.data || []
  const allPosts = postsRes.data || []
  const posts = kategori
    ? allPosts.filter((p) => p.blog_categories?.slug === kategori)
    : allPosts

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-between">
      <SiteHeader menus={menuRes.data || []} generalSettings={setRes.data?.value || {}} />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div className="bg-[#0d1f18] text-white rounded-3xl p-8 sm:p-12 space-y-4">
          <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#eab130]">
            <BookOpen className="w-4 h-4" />
            DietBox Blog
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Sağlıklı Yaşam &amp; Beslenme Rehberi
          </h1>
          <p className="text-sm sm:text-base text-white/75 max-w-2xl">
            Diyetisyen kontrolünde dengeli beslenme, kilo yönetimi, detoks ve pratik yaşam ipuçları.
          </p>
        </div>

        {/* KATEGORİ FİLTRESİ */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/blog"
            className={`px-4 py-2 rounded-full text-xs font-bold transition ${
              !kategori
                ? 'bg-[#0d1f18] text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-[#51a885]'
            }`}
          >
            Tümü ({allPosts.length})
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/blog?kategori=${cat.slug}`}
              className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                kategori === cat.slug
                  ? 'bg-[#51a885] text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-[#51a885]'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* YAN YANA 3'LÜ GRID */}
        {posts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-sm text-slate-500">
            Bu kategoride henüz yayınlanmış yazı bulunmuyor.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group bg-white rounded-3xl border border-slate-200/80 hover:border-[#51a885] overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col"
              >
                <div className="aspect-[16/10] bg-slate-100 overflow-hidden relative">
                  <img
                    src={
                      post.cover_image ||
                      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80'
                    }
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {post.blog_categories?.name && (
                    <span className="absolute top-3 left-3 bg-[#0d1f18]/85 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                      {post.blog_categories.name}
                    </span>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-[#51a885]" />
                      {new Date(post.published_at || post.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 group-hover:text-[#51a885] transition line-clamp-2">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                  </div>

                  <span className="text-xs font-extrabold text-[#51a885] inline-flex items-center gap-1 pt-2 border-t border-slate-100">
                    Devamını Oku <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <SiteFooter generalSettings={setRes.data?.value || {}} />
    </div>
  )
}