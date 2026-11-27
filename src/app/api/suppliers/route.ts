// src/app/api/suppliers/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const onlyActive = searchParams.get('active') === 'true'
    const supabase = createAdminClient()

    let query = supabase
      .from('suppliers')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })

    if (onlyActive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message, suppliers: [] }, { status: 500 })
    }

    return NextResponse.json({ suppliers: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Sunucu hatası', suppliers: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        name: String(body.name || '').trim(),
        logo_url: String(body.logo_url || '').trim(),
        category: String(body.category || 'Gıda Tedarikçisi').trim(),
        sort_order: Number(body.sort_order) || 1,
        is_active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ supplier: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Kayıt eklenemedi' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    const supabase = createAdminClient()

    const { error } = await supabase.from('suppliers').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID eksik' }, { status: 400 })

    const supabase = createAdminClient()
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Silinemedi' }, { status: 500 })
  }
}