// src/app/api/track/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      user_id,
      customer_email,
      customer_name,
      visitor_id,
      path,
      page_title,
      action_type = 'page_view',
      metadata = {},
    } = body

    if (!path || path.startsWith('/admin') || path.startsWith('/kurye')) {
      return NextResponse.json({ skipped: true })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('activity_logs').insert({
      user_id: user_id || null,
      customer_email: customer_email ? String(customer_email).toLowerCase() : null,
      customer_name: customer_name || null,
      visitor_id: visitor_id || null,
      path,
      page_title: page_title || path,
      action_type,
      metadata,
    })

    if (error) {
      console.error('Activity log insert error:', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Activity log route error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Hata' }, { status: 500 })
  }
}
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      return NextResponse.json({ logs: [], error: error.message }, { status: 500 })
    }
    return NextResponse.json({ logs: data || [] })
  } catch (err: any) {
    return NextResponse.json({ logs: [], error: err?.message }, { status: 500 })
  }
}