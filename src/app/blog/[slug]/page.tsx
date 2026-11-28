// src/app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { ArrowLeft, Calendar, Tag } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, meta_title, meta_description, cover_image')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) {
    return { title: 'Yazı Bulunamadı | DietBox' }
  }

  const title = post.meta_title || `${post.title} | DietBox Blog`
  const description = post.meta_description || post.excerpt || post.title

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: post.cover_image ? [{ url: post.cover_image }] : [],
    },
  }
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = createAdminClient()

  const [menuRes, setRes, postRes] = await Promise.all([
    supabase.from('navigation_menus').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('system_settings').select('value').eq('key', 'general_settings').single(),
    supabase
      .from('blog_posts')
      .select('*, blog_categories(id, name, slug)')
      .eq('slug', slug)
      .eq('status', 'published')
      .single(),
  ])

  if (!postRes.data) {
    notFound()
  }

  const post = postRes.data

  const { data: relatedPosts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, cover_image, published_at, created_at')
    .eq('status', 'published')
    .neq('id', post.id)
    .order('published_at', { ascending: false })
    .limit(3)

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-between">
      <SiteHeader menus={menuRes.data || []} generalSettings={setRes.data?.value || {}} />

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#51a885]"
        >
          <ArrowLeft className="w-4 h-4" /> Tüm Blog Yazılarına Dön
        </Link>

        <article className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          {post.cover_image && (
            <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
              <img
                src={post.cover_image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 sm:p-10 space-y-6">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {post.blog_categories?.name && (
                <Link
                  href={`/blog?kategori=${post.blog_categories.slug}`}
                  className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {post.blog_categories.name}
                </Link>
              )}
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-[#51a885]" />
                {new Date(post.published_at || post.created_at).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">
              {post.title}
            </h1>

            <div
              className="prose prose-slate max-w-none prose-headings:font-extrabold prose-a:text-[#51a885]"
              dangerouslySetInnerHTML={{ __html: post.content || '' }}
            />
          </div>
        </article>

        {relatedPosts && relatedPosts.length > 0 && (
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-black text-slate-900">Diğer Yazılarımız</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/blog/${rp.slug}`}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-[#51a885] transition"
                >
                  {rp.cover_image && (
                    <img
                      src={rp.cover_image}
                      alt={rp.title}
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="text-xs font-extrabold text-slate-900 line-clamp-2">
                      {rp.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <SiteFooter generalSettings={setRes.data?.value || {}} />
    </div>
  )
}