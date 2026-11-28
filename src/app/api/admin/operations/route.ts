// src/app/api/admin/operations/route.ts
import { NextResponse } from 'next/server'
import { addDays, format, getDay, isSaturday, isSunday, parseISO, subDays } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/server'

function buildScheduleWithExclusions(
  startDateStr: string,
  totalPackageDays: number,
  scheduleType: string,
  excludedWeekdays: number[] = [],
  holidayDates: string[] = []
) {
  const holidaySet = new Set(holidayDates)
  const excludedSet = new Set(excludedWeekdays.map(Number))
  const deliveries: { delivery_date: string; package_quantity: number }[] = []

  let remaining = Math.max(1, Number(totalPackageDays) || 1)
  let current = parseISO(startDateStr)
  let safety = 0

  if (isSunday(current) && scheduleType === 'every_day_sat_double' && remaining > 0) {
    const prevSatStr = format(subDays(current, 1), 'yyyy-MM-dd')
    if (!holidaySet.has(prevSatStr)) {
      deliveries.push({ delivery_date: prevSatStr, package_quantity: 1 })
      remaining -= 1
    }
    current = addDays(current, 1)
  }

  while (remaining > 0 && safety < 365) {
    safety++
    const dateStr = format(current, 'yyyy-MM-dd')
    const dow = getDay(current)

    if (holidaySet.has(dateStr) || isSunday(current) || excludedSet.has(dow)) {
      current = addDays(current, 1)
      continue
    }

    if (isSaturday(current)) {
      if (scheduleType === 'weekdays_only') {
        current = addDays(current, 1)
        continue
      }
      if (scheduleType === 'every_day_sat_double') {
        const qty = remaining >= 2 ? 2 : 1
        deliveries.push({ delivery_date: dateStr, package_quantity: qty })
        remaining -= qty
        current = addDays(current, 1)
        continue
      }
    }

    deliveries.push({ delivery_date: dateStr, package_quantity: 1 })
    remaining -= 1
    current = addDays(current, 1)
  }

  const estimatedEndDate =
    deliveries.length > 0 ? deliveries[deliveries.length - 1].delivery_date : startDateStr

  return { deliveries, estimatedEndDate }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, payload } = body
    const supabase = createAdminClient()

    // 1. TEK EKRANDAN WHATSAPP / MANUEL SİPARİŞ & ÜYE KAYDI
    if (action === 'create_manual_order') {
      const {
        customerName,
        customerPhone,
        customerEmail,
        cityName = 'İstanbul',
        districtName,
        neighborhoodId,
        neighborhoodName,
        fullAddress,
        packageId,
        packageTitle,
        durationDays,
        deliveryScheduleType = 'every_day_sat_double',
        excludedWeekdays = [],
        startDate,
        grandTotal = 0,
        balanceDue = 0,
        paymentMethod = 'eft',
        heightCm,
        weightKg,
        dietitianNote = '',
        orderNote = '',
        specialOpsNote = '',
        source = 'whatsapp',
      } = payload

      if (!customerName || !customerPhone || !startDate || !packageTitle) {
        return NextResponse.json(
          { error: 'Müşteri adı, telefon, paket ve başlangıç tarihi zorunludur.' },
          { status: 400 }
        )
      }

      const { data: blocks } = await supabase.from('calendar_blocks').select('blocked_date')
      const holidayDates = (blocks || []).map((b) => b.blocked_date)

      const { deliveries, estimatedEndDate } = buildScheduleWithExclusions(
        startDate,
        Number(durationDays),
        deliveryScheduleType,
        excludedWeekdays,
        holidayDates
      )

      const orderNumber = `DB-WP${Math.floor(100000 + Math.random() * 900000)}`
      const safeTotal = Number(grandTotal) || 0
      const safeBalance = Number(balanceDue) || 0

      const { data: createdOrder, error: ordErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: (customerEmail || '').trim() || null,
          city_name: cityName,
          district_name: districtName || '',
          neighborhood_id: neighborhoodId ? Number(neighborhoodId) : null,
          neighborhood_name: neighborhoodName || '',
          full_address: (fullAddress || '').trim(),
          package_id: packageId || null,
          package_title: packageTitle,
          duration_days: Number(durationDays),
          delivery_schedule_type: deliveryScheduleType,
          start_date: startDate,
          estimated_end_date: estimatedEndDate,
          package_subtotal: safeTotal,
          logistics_fee_total: 0,
          addons_total: 0,
          grand_total: safeTotal,
          payment_method: paymentMethod,
          payment_status: safeBalance > 0 ? 'pending' : 'paid',
          status: 'active',
          height_cm: heightCm ? Number(heightCm) : null,
          weight_kg: weightKg ? Number(weightKg) : null,
          order_note: orderNote.trim() || null,
          dietitian_note: dietitianNote.trim(),
          special_ops_note: specialOpsNote.trim(),
          balance_due: safeBalance,
          excluded_weekdays: excludedWeekdays,
          changed_fields: {},
          source,
        })
        .select('*')
        .single()

      if (ordErr) {
        return NextResponse.json({ error: ordErr.message }, { status: 500 })
      }

      if (deliveries.length > 0) {
        const deliveryRows = deliveries.map((d) => ({
          order_id: createdOrder.id,
          delivery_date: d.delivery_date,
          package_quantity: d.package_quantity,
          status: 'scheduled',
        }))
        const { error: delErr } = await supabase.from('order_deliveries').insert(deliveryRows)
        if (delErr) {
          return NextResponse.json({ error: delErr.message }, { status: 500 })
        }
      }

      return NextResponse.json({
        success: true,
        orderNumber,
        estimatedEndDate,
        totalDeliveryDays: deliveries.length,
      })
    }

    // 2. ÜYE TAKİP PANOSUNDAN HIZLI GÜNCELLEME (ADRES / PAKET / KALORİ DEĞİŞİKLİĞİNİ OTOMATİK RENKLE)
    if (action === 'update_order_ops') {
      const {
        orderId,
        package_title,
        full_address,
        district_name,
        neighborhood_name,
        dietitian_note,
        order_note,
        special_ops_note,
        balance_due,
        status,
      } = payload

      if (!orderId) {
        return NextResponse.json({ error: 'Sipariş ID eksik.' }, { status: 400 })
      }

      // Mevcut siparişi çekip hangi alanın değiştiğini yakala
      const { data: existing } = await supabase
        .from('orders')
        .select('package_title, full_address, district_name, neighborhood_name, dietitian_note, changed_fields')
        .eq('id', orderId)
        .single()

      const todayStr = format(new Date(), 'yyyy-MM-dd')
      const nextChanged: Record<string, string> = { ...(existing?.changed_fields || {}) }
      const updateFields: Record<string, any> = {}

      if (package_title !== undefined) {
        const val = String(package_title).trim()
        updateFields.package_title = val
        if (existing && val !== String(existing.package_title || '').trim()) {
          nextChanged.package = todayStr
        }
      }

      if (dietitian_note !== undefined) {
        const val = String(dietitian_note).trim()
        updateFields.dietitian_note = val
        if (existing && val !== String(existing.dietitian_note || '').trim()) {
          nextChanged.calorie = todayStr
        }
      }

      let addressChanged = false
      if (full_address !== undefined) {
        const val = String(full_address).trim()
        updateFields.full_address = val
        if (existing && val !== String(existing.full_address || '').trim()) addressChanged = true
      }
      if (district_name !== undefined) {
        const val = String(district_name).trim()
        updateFields.district_name = val
        if (existing && val !== String(existing.district_name || '').trim()) addressChanged = true
      }
      if (neighborhood_name !== undefined) {
        const val = String(neighborhood_name).trim()
        updateFields.neighborhood_name = val
        if (existing && val !== String(existing.neighborhood_name || '').trim()) addressChanged = true
      }
      if (addressChanged) {
        nextChanged.address = todayStr
      }

      if (order_note !== undefined) updateFields.order_note = String(order_note).trim()
      if (special_ops_note !== undefined)
        updateFields.special_ops_note = String(special_ops_note).trim()
      if (balance_due !== undefined) updateFields.balance_due = Number(balance_due) || 0
      if (status !== undefined) updateFields.status = status

      updateFields.changed_fields = nextChanged

      const { error } = await supabase.from('orders').update(updateFields).eq('id', orderId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, changed_fields: nextChanged })
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Sunucu hatası' }, { status: 500 })
  }
}