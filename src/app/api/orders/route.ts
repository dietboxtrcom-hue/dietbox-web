// src/app/api/orders/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateDeliverySchedule } from '@/lib/calendar-engine'
import { sendOrderEmails } from '@/lib/mailer'
import { DeliveryScheduleType } from '@/types/database'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createAdminClient()

    const {
      customerName,
      customerPhone,
      customerEmail,
      cityName,
      districtName,
      neighborhoodId,
      neighborhoodName,
      fullAddress,
      packageId,
      packageTitle,
      durationDays,
      deliveryScheduleType,
      startDate,
      packageSubtotal,
      logisticsFeeTotal,
      addonsTotal,
      grandTotal,
      paymentMethod,
      heightCm,
      weightKg,
      orderNote,
      invoiceType,
      invoiceDetails,
    } = body

    // 1. Resmi tatil günlerini çek ki teslimat takviminde müşterinin hakkı yanmasın, ileri ötelensin
    const { data: blocks } = await supabase
      .from('calendar_blocks')
      .select('blocked_date')
      .eq('block_type', 'holiday')

    const holidayDates = (blocks || []).map((b) => b.blocked_date)

    // 2. Teslimat günlerini ve kesin bitiş tarihini hesapla
    const schedule = generateDeliverySchedule(
      startDate,
      Number(durationDays),
      deliveryScheduleType as DeliveryScheduleType,
      holidayDates
    )

    // 3. Sipariş numarası üret (Örn: DB-849201)
    const randomCode = Math.floor(100000 + Math.random() * 900000)
    const orderNumber = `DB-${randomCode}`

    // 4. Siparişi orders tablosuna kaydet
    const { data: createdOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || null,
        city_name: cityName,
        district_name: districtName,
        neighborhood_id: neighborhoodId || null,
        neighborhood_name: neighborhoodName,
        full_address: fullAddress,
        package_id: packageId || null,
        package_title: packageTitle,
        duration_days: Number(durationDays),
        delivery_schedule_type: deliveryScheduleType,
        start_date: startDate,
        estimated_end_date: schedule.estimatedEndDate,
        package_subtotal: Number(packageSubtotal),
        logistics_fee_total: Number(logisticsFeeTotal),
        addons_total: Number(addonsTotal || 0),
        grand_total: Number(grandTotal),
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'eft' ? 'pending' : 'paid',
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        order_note: orderNote || null,
        invoice_type: invoiceType,
        invoice_details: invoiceDetails || {},
        status: 'active',
      })
      .select('*')
      .single()

    if (orderError || !createdOrder) {
      return NextResponse.json(
        { error: orderError?.message || 'Sipariş kaydedilemedi.' },
        { status: 400 }
      )
    }

    // 5. Günlük mutfak ve kurye sevkiyat satırlarını (order_deliveries) otomatik oluştur
    const deliveryRows = schedule.deliveries.map((d) => ({
      order_id: createdOrder.id,
      delivery_date: d.delivery_date,
      package_quantity: d.package_quantity,
      status: 'scheduled',
    }))

    const { error: deliveriesError } = await supabase
      .from('order_deliveries')
      .insert(deliveryRows)

    if (deliveriesError) {
      return NextResponse.json({ error: deliveriesError.message }, { status: 400 })
    }

    // 6. Gmail SMTP üzerinden hem müşteriye hem admine çift taraflı sipariş maili gönder
    await sendOrderEmails({
      orderNumber: createdOrder.order_number,
      customerName,
      customerEmail: customerEmail || null,
      customerPhone,
      packageTitle,
      durationDays: Number(durationDays),
      startDate,
      estimatedEndDate: schedule.estimatedEndDate,
      districtName,
      neighborhoodName,
      fullAddress,
      grandTotal: Number(grandTotal),
      orderNote: orderNote || null,
    })

    return NextResponse.json({
      success: true,
      orderNumber: createdOrder.order_number,
      orderId: createdOrder.id,
      estimatedEndDate: schedule.estimatedEndDate,
      totalDeliveryDays: schedule.deliveries.length,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Sunucu hatası oluştu.' },
      { status: 500 }
    )
  }
}