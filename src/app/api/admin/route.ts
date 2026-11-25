// src/app/api/admin/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendFreezeEmails } from '@/lib/mailer'
import { addDays, format, isSunday, isSaturday, parseISO } from 'date-fns'

function getNextValidDeliveryDate(
  lastDateStr: string,
  scheduleType: string,
  blockedDates: Set<string>
): string {
  let candidate = addDays(parseISO(lastDateStr), 1)
  let safety = 0
  while (safety < 90) {
    safety++
    const dStr = format(candidate, 'yyyy-MM-dd')
    if (blockedDates.has(dStr) || isSunday(candidate)) {
      candidate = addDays(candidate, 1)
      continue
    }
    if (isSaturday(candidate) && scheduleType === 'weekdays_only') {
      candidate = addDays(candidate, 1)
      continue
    }
    return dStr
  }
  return format(candidate, 'yyyy-MM-dd')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, payload } = body
    const supabase = createAdminClient()

    // 1. ADMİN GİRİŞ DOĞRULAMA (Güvenlik Koruması)
    if (action === 'admin_login') {
      const { email, password } = payload
      const { data: user, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', (email || '').trim())
        .eq('password_plain', password)
        .eq('is_active', true)
        .single()

      if (error || !user) {
        return NextResponse.json(
          { error: 'E-posta veya şifre hatalı ya da yetkiniz bulunmuyor.' },
          { status: 401 }
        )
      }
      return NextResponse.json({
        success: true,
        adminUser: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      })
    }

    // 2. YENİ ADMİN YETKİLİ KULLANICI EKLEME / SİLME
    if (action === 'save_admin_user') {
      const { full_name, email, password_plain, role } = payload
      const { error } = await supabase.from('admin_users').upsert(
        {
          full_name,
          email: (email || '').trim(),
          password_plain,
          role: role || 'editor',
          is_active: true,
        },
        { onConflict: 'email' }
      )
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'delete_admin_user') {
      const { error } = await supabase.from('admin_users').delete().eq('id', payload.id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // 3. SLIDER EKLEME / DÜZENLEME / SİLME (Resim & Video Destekli)
    if (action === 'save_slider') {
      const {
        id,
        badge_text,
        title,
        subtitle,
        price_highlight,
        button_text,
        button_url,
        media_type,
        media_url,
        sort_order,
        is_active,
      } = payload

      const rec = {
        badge_text: badge_text || '',
        title,
        subtitle: subtitle || '',
        price_highlight: price_highlight || '',
        button_text: button_text || 'Paketi İncele',
        button_url: button_url || '/paketler',
        media_type: media_type || 'image',
        media_url,
        sort_order: Number(sort_order || 1),
        is_active: is_active ?? true,
      }

      if (id) {
        const { error } = await supabase.from('sliders').update(rec).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('sliders').insert(rec)
        if (error) throw error
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'delete_slider') {
      const { error } = await supabase.from('sliders').delete().eq('id', payload.id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // 4. MÜŞTERİ SİPARİŞ SORGULAMA (/hesabim)
    if (action === 'lookup_customer_orders') {
      const queryText = (payload?.query || '').trim()
      if (!queryText) {
        return NextResponse.json({ error: 'Sorgu boş olamaz' }, { status: 400 })
      }
      const isOrderNo = queryText.toUpperCase().startsWith('DB-')
      let q = supabase
        .from('orders')
        .select('*, order_deliveries(*)')
        .order('created_at', { ascending: false })
      if (isOrderNo) {
        q = q.ilike('order_number', queryText)
      } else {
        const cleanDigits = queryText.replace(/\D/g, '').slice(-10)
        q = q.ilike('customer_phone', `%${cleanDigits}%`)
      }
      const { data: orders, error } = await q
      if (error) throw error
      return NextResponse.json({ orders: orders || [] })
    }

    // 5. ÜRÜN / PAKET TAM KAPSAMLI KAYDETME & YENİ EKLEME
    if (action === 'save_package_full') {
      const {
        id,
        slug,
        title,
        category,
        daily_base_price,
        short_description,
        full_description,
        calories_range,
        protein_info,
        meal_count_text,
        cover_image,
        custom_duration_prices,
        sample_menu_table,
        is_active,
      } = payload

      const record = {
        slug,
        title,
        category: category || 'Diyet Paketleri',
        daily_base_price: Number(daily_base_price),
        short_description,
        full_description,
        calories_range,
        protein_info,
        meal_count_text,
        cover_image,
        custom_duration_prices: custom_duration_prices || [],
        sample_menu_table: sample_menu_table || [],
        is_active: is_active ?? true,
      }

      if (id) {
        const { error } = await supabase.from('packages').update(record).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('packages').insert(record)
        if (error) throw error
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'delete_package') {
      const { error } = await supabase.from('packages').delete().eq('id', payload.id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // 6. İL, İLÇE VE MAHALLE YÖNETİMİ
    if (action === 'save_city') {
      const { id, name, is_active } = payload
      if (id) {
        const { error } = await supabase.from('cities').update({ name, is_active }).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('cities')
          .insert({ name, is_active: is_active ?? true })
        if (error) throw error
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'save_district') {
      const { id, city_id, side, name, is_active, default_daily_fee } = payload
      const rec = {
        city_id: Number(city_id),
        side: side || 'Anadolu Yakası',
        name,
        is_active: is_active ?? true,
        default_daily_fee: Number(default_daily_fee || 0),
      }
      if (id) {
        const { error } = await supabase.from('districts').update(rec).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('districts').insert(rec)
        if (error) throw error
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'save_neighborhood_full') {
      const {
        id,
        district_id,
        name,
        is_active,
        custom_daily_fee,
        delivery_time_note,
        period_fees,
      } = payload
      const rec = {
        district_id: Number(district_id),
        name: name.toUpperCase().trim(),
        is_active: is_active ?? true,
        custom_daily_fee:
          custom_daily_fee === '' || custom_daily_fee === null ? 0 : Number(custom_daily_fee),
        delivery_time_note: delivery_time_note || '06:30 - 09:00',
        period_fees: period_fees || {},
      }
      if (id) {
        const { error } = await supabase.from('neighborhoods').update(rec).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('neighborhoods').insert(rec)
        if (error) throw error
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'delete_neighborhood') {
      const { error } = await supabase.from('neighborhoods').delete().eq('id', payload.id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // 7. MENÜ YÖNETİCİSİ (Sequence Çakışmasına Karşı Korumalı)
    if (action === 'save_menu_item') {
      const { id, parent_id, title, url, sort_order, is_active } = payload
      const rec = {
        parent_id: parent_id && String(parent_id).trim() !== '' ? Number(parent_id) : null,
        title: (title || '').trim(),
        url: (url || '').trim(),
        sort_order: Number(sort_order || 1),
        is_active: is_active ?? true,
      }

      if (id) {
        const { error } = await supabase.from('navigation_menus').update(rec).eq('id', id)
        if (error) throw error
      } else {
        const { data: maxRow } = await supabase
          .from('navigation_menus')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .single()
        const nextId = (maxRow?.id || 0) + 1
        const { error } = await supabase
          .from('navigation_menus')
          .insert({ id: nextId, ...rec })
        if (error) throw error
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'delete_menu_item') {
      const { error } = await supabase.from('navigation_menus').delete().eq('id', payload.id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // 8. GENEL SİTE, WHATSAPP VE SANAL POS AYARLARI
    if (action === 'save_system_setting') {
      const { key, value } = payload
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() })
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // 9. PAKET DONDURMA / TESLİMAT ERTELEME (Çift Taraflı Mail Destekli)
    if (action === 'freeze_delivery_day') {
      const { deliveryId, orderId } = payload
      const { data: targetDelivery } = await supabase
        .from('order_deliveries')
        .select('*')
        .eq('id', deliveryId)
        .single()

      if (!targetDelivery || targetDelivery.status !== 'scheduled') {
        throw new Error('Sadece bekleyen teslimat günleri dondurulabilir.')
      }

      const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single()
      const { data: allDeliveries } = await supabase
        .from('order_deliveries')
        .select('delivery_date')
        .eq('order_id', orderId)
        .order('delivery_date', { ascending: false })
      const { data: blocks } = await supabase.from('calendar_blocks').select('blocked_date')

      const blockedSet = new Set((blocks || []).map((b) => b.blocked_date))
      const lastDate = allDeliveries?.[0]?.delivery_date || order.estimated_end_date
      const newEndDate = getNextValidDeliveryDate(
        lastDate,
        order.delivery_schedule_type,
        blockedSet
      )

      await supabase.from('order_deliveries').update({ status: 'frozen' }).eq('id', deliveryId)
      await supabase.from('order_deliveries').insert({
        order_id: orderId,
        delivery_date: newEndDate,
        package_quantity: targetDelivery.package_quantity,
        status: 'scheduled',
      })
      await supabase.from('orders').update({ estimated_end_date: newEndDate }).eq('id', orderId)

      // Gmail SMTP üzerinden müşteriye + admine gün dondurma bildirimi gönder
      await sendFreezeEmails({
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        frozenDate: targetDelivery.delivery_date,
        newEndDate,
      })

      return NextResponse.json({ success: true, newEndDate })
    }

    // 10. RESMİ TATİL / KOTA KAPATMA
    if (action === 'add_calendar_block') {
      const { blockedDate, reason, blockType } = payload
      const { error } = await supabase.from('calendar_blocks').insert({
        blocked_date: blockedDate,
        reason,
        block_type: blockType,
      })
      if (error) throw error

      let shiftedCount = 0
      if (blockType === 'holiday') {
        const { data: affectedDeliveries } = await supabase
          .from('order_deliveries')
          .select('*')
          .eq('delivery_date', blockedDate)
          .eq('status', 'scheduled')

        const { data: blocks } = await supabase.from('calendar_blocks').select('blocked_date')
        const blockedSet = new Set((blocks || []).map((b) => b.blocked_date))
        blockedSet.add(blockedDate)

        for (const item of affectedDeliveries || []) {
          const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('id', item.order_id)
            .single()
          const { data: allDeliveries } = await supabase
            .from('order_deliveries')
            .select('delivery_date')
            .eq('order_id', item.order_id)
            .order('delivery_date', { ascending: false })

          const lastDate = allDeliveries?.[0]?.delivery_date || blockedDate
          const nextDate = getNextValidDeliveryDate(
            lastDate,
            order?.delivery_schedule_type || 'every_day_sat_double',
            blockedSet
          )

          await supabase
            .from('order_deliveries')
            .update({ status: 'holiday_shifted' })
            .eq('id', item.id)
          await supabase.from('order_deliveries').insert({
            order_id: item.order_id,
            delivery_date: nextDate,
            package_quantity: item.package_quantity,
            status: 'scheduled',
          })
          await supabase
            .from('orders')
            .update({ estimated_end_date: nextDate })
            .eq('id', item.order_id)
          shiftedCount++
        }
      }
      return NextResponse.json({ success: true, shiftedCount })
    }

    if (action === 'delete_calendar_block') {
      await supabase.from('calendar_blocks').delete().eq('id', payload.id)
      return NextResponse.json({ success: true })
    }

    if (action === 'update_delivery_status') {
      const { deliveryId, status } = payload
      await supabase
        .from('order_deliveries')
        .update({
          status,
          delivered_at: status === 'delivered' ? new Date().toISOString() : null,
        })
        .eq('id', deliveryId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Sunucu hatası' }, { status: 500 })
  }
}