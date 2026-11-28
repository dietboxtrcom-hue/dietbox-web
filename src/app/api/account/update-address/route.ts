// src/app/api/account/update-address/route.ts
import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/server'
import { getAddressChangeEligibility, getIstanbulNow } from '@/lib/calendar-engine'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, districtName, neighborhoodId, neighborhoodName, fullAddress } = body

    if (!orderId || !districtName || !neighborhoodName || !String(fullAddress || '').trim()) {
      return NextResponse.json(
        { error: 'İlçe, mahalle ve açık adres alanları zorunludur.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: order, error: ordErr } = await supabase
      .from('orders')
      .select('id, status, changed_fields, order_deliveries(id, delivery_date, status)')
      .eq('id', orderId)
      .single()

    if (ordErr || !order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 })
    }

    const { istanbulDayStart } = getIstanbulNow()
    const todayStr = format(istanbulDayStart, 'yyyy-MM-dd')

    // Bir sonraki planlanmış (scheduled) teslimat gününü bul
    const upcomingDeliveries = (order.order_deliveries || [])
      .filter((d: any) => d.status === 'scheduled' && d.delivery_date > todayStr)
      .sort((a: any, b: any) => a.delivery_date.localeCompare(b.delivery_date))

    if (upcomingDeliveries.length === 0) {
      return NextResponse.json(
        { error: 'Bu siparişte gelecek tarihli planlanmış teslimat bulunmuyor.' },
        { status: 400 }
      )
    }

    const nextDeliveryDate = upcomingDeliveries[0].delivery_date
    const eligibility = getAddressChangeEligibility(nextDeliveryDate)

    if (!eligibility.canChange) {
      return NextResponse.json({ error: eligibility.reason }, { status: 400 })
    }

    const nextChanged = {
      ...(order.changed_fields || {}),
      address: todayStr,
    }

    const { error: updErr } = await supabase
      .from('orders')
      .update({
        district_name: String(districtName).trim(),
        neighborhood_id: neighborhoodId ? Number(neighborhoodId) : null,
        neighborhood_name: String(neighborhoodName).trim(),
        full_address: String(fullAddress).trim(),
        changed_fields: nextChanged,
      })
      .eq('id', orderId)

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      nextDeliveryDate,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Sunucu hatası' }, { status: 500 })
  }
}