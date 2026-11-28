// src/app/api/blog/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function slugifyTR(text: string) {
  return String(text || '')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const onlyPublished = searchParams.get('published') === 'true'
    const limit = Number(searchParams.get('limit') || 0)

    const supabase = createAdminClient()

    let postsQuery = supabase
      .from('blog_posts')
      .select('*, blog_categories(id, name, slug)')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (onlyPublished) {
      postsQuery = postsQuery.eq('status', 'published')
    }
    if (limit > 0) {
      postsQuery = postsQuery.limit(limit)
    }

    const [postsRes, catsRes] = await Promise.all([
      postsQuery,
      supabase.from('blog_categories').select('*').order('sort_order').order('name'),
    ])

    if (postsRes.error) {
      return NextResponse.json({ error: postsRes.error.message, posts: [], categories: [] }, { status: 500 })
    }

    return NextResponse.json({
      posts: postsRes.data || [],
      categories: catsRes.data || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Sunucu hatası', posts: [], categories: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, payload } = body
    const supabase = createAdminClient()

    if (type === 'save_category') {
      const name = String(payload.name || '').trim()
      const slug = slugifyTR(payload.slug || name)
      if (!name || !slug) return NextResponse.json({ error: 'Kategori adı zorunludur.' }, { status: 400 })

      if (payload.id) {
        const { error } = await supabase
          .from('blog_categories')
          .update({ name, slug, sort_order: Number(payload.sort_order) || 0 })
          .eq('id', payload.id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      } else {
        const { error } = await supabase
          .from('blog_categories')
          .insert({ name, slug, sort_order: Number(payload.sort_order) || 0 })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    if (type === 'delete_category') {
      const { error } = await supabase.from('blog_categories').delete().eq('id', payload.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (type === 'save_post') {
      const title = String(payload.title || '').trim()
      const slug = slugifyTR(payload.slug || title)
      if (!title || !slug) return NextResponse.json({ error: 'Yazı başlığı zorunludur.' }, { status: 400 })

      const status = payload.status === 'published' ? 'published' : 'draft'
      const record: any = {
        title,
        slug,
        category_id: payload.category_id ? Number(payload.category_id) : null,
        excerpt: String(payload.excerpt || '').trim(),
        content: String(payload.content || ''),
        cover_image: String(payload.cover_image || '').trim(),
        status,
        meta_title: String(payload.meta_title || '').trim(),
        meta_description: String(payload.meta_description || '').trim(),
        updated_at: new Date().toISOString(),
      }

      if (status === 'published') {
        record.published_at = payload.published_at || new Date().toISOString()
      }

      if (payload.id) {
        const { error } = await supabase.from('blog_posts').update(record).eq('id', payload.id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      } else {
        const { error } = await supabase.from('blog_posts').insert(record)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, slug })
    }

    if (type === 'toggle_status') {
      const nextStatus = payload.status === 'published' ? 'draft' : 'published'
      const updateData: any = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      }
      if (nextStatus === 'published') {
        updateData.published_at = new Date().toISOString()
      }
      const { error } = await supabase.from('blog_posts').update(updateData).eq('id', payload.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (type === 'delete_post') {
      const { error } = await supabase.from('blog_posts').delete().eq('id', payload.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'İşlem başarısız' }, { status: 500 })
  }
}