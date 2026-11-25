// src/app/api/account/orders/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { userId, email, phone, searchQuery } = await request.json()
    const supabase = createAdminClient()

    // Tüm siparişleri teslimatlarıyla çekip güvenli şekilde filtreleyelim
    // (Telefon format farkları: 0507 274 20 62 vs 05072742062 yüzünden sipariş kaçmaz)
    const { data: allOrders, error } = await supabase
      .from('orders')
      .select('*, order_deliveries(*)')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error

    const cleanTargetPhone = (phone || '').replace(/\D/g, '').slice(-10)
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanQuery = (searchQuery || '').trim().toLowerCase()
    const cleanQueryDigits = cleanQuery.replace(/\D/g, '').slice(-10)

    const matched = (allOrders || []).filter((o: any) => {
      // Misafir arama kutusu kullanıldıysa
      if (cleanQuery) {
        const orderNoMatch = (o.order_number || '').toLowerCase() === cleanQuery
        const emailMatch = (o.customer_email || '').toLowerCase() === cleanQuery
        const orderPhoneDigits = (o.customer_phone || '').replace(/\D/g, '').slice(-10)
        const phoneMatch =
          cleanQueryDigits.length >= 7 && orderPhoneDigits.includes(cleanQueryDigits)
        return orderNoMatch || emailMatch || phoneMatch
      }

      // Giriş yapmış üye için otomatik eşleştirme
      if (userId && o.user_id === userId) return true
      if (cleanEmail && (o.customer_email || '').trim().toLowerCase() === cleanEmail) return true

      if (cleanTargetPhone.length >= 10) {
        const orderPhoneDigits = (o.customer_phone || '').replace(/\D/g, '').slice(-10)
        if (orderPhoneDigits === cleanTargetPhone) return true
      }

      return false
    })

    return NextResponse.json({ orders: matched })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Siparişler alınamadı.' }, { status: 500 })
  }
}