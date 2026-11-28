// src/components/BlogCarouselSection.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight, BookOpen, Calendar } from 'lucide-react'

export default function BlogCarouselSection() {
  const [posts, setPosts] = useState<any[]>([])
  const [index, setIndex] = useState(0)
  const [perView, setPerView] = useState(3)

  useEffect(() => {
    fetch('/api/blog?published=true&limit=12', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.posts)) setPosts(data.posts)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const updatePerView = () => {
      if (window.innerWidth < 640) setPerView(1)
      else if (window.innerWidth < 1024) setPerView(2)
      else setPerView(3)
    }
    updatePerView()
    window.addEventListener('resize', updatePerView)
    return () => window.removeEventListener('resize', updatePerView)
  }, [])

  const maxIndex = Math.max(0, posts.length - perView)

  useEffect(() => {
    if (index > maxIndex) setIndex(0)
  }, [maxIndex, index])

  useEffect(() => {
    if (posts.length <= perView) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))
    }, 5500)
    return () => clearInterval(timer)
  }, [posts.length, perView, maxIndex])

  if (posts.length === 0) return null

  const visiblePosts = posts.slice(index, index + perView)

  return (
    <section className="py-16 bg-[#f8faf9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#51a885] mb-1">
              <BookOpen className="w-4 h-4 text-[#eab130]" />
              Diyetisyen Köşesi &amp; Blog
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Sağlıklı Yaşam Rehberi
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {posts.length > perView && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIndex((prev) => (prev <= 0 ? maxIndex : prev - 1))}
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:border-[#51a885] text-slate-700 flex items-center justify-center cursor-pointer transition"
                  aria-label="Önceki"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))}
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:border-[#51a885] text-slate-700 flex items-center justify-center cursor-pointer transition"
                  aria-label="Sonraki"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <Link
              href="/blog"
              className="text-xs font-extrabold text-[#51a885] hover:text-[#0d1f18] inline-flex items-center gap-1 transition"
            >
              Tüm Yazılar <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePosts.map((post) => (
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
                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#51a885] transition line-clamp-2">
                    {post.title}
                  </h3>
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
      </div>
    </section>
  )
}