// src/app/api/paytr/callback/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const params = new URLSearchParams(rawBody)

    const merchant_oid = params.get('merchant_oid') || ''
    const status = params.get('status') || ''
    const total_amount = params.get('total_amount') || ''
    const hash = params.get('hash') || ''

    const supabase = createAdminClient()
    const { data: posRow } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'pos_config')
      .single()

    const pos = posRow?.value || {}
    const merchant_key = process.env.PAYTR_MERCHANT_KEY || pos.paytr_merchant_key || ''
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT || pos.paytr_merchant_salt || ''

    const expectedHash = crypto
      .createHmac('sha256', merchant_key)
      .update(merchant_oid + merchant_salt + status + total_amount)
      .digest('base64')

    if (hash !== expectedHash) {
      return new NextResponse('PAYTR notification failed: bad hash', { status: 400 })
    }

    // DB123456 -> DB-123456 eşleştirmesi
    const formattedOrderNo = merchant_oid.startsWith('DB') && !merchant_oid.includes('-')
      ? `DB-${merchant_oid.slice(2)}`
      : merchant_oid

    if (status === 'success') {
      await supabase
        .from('orders')
        .update({ payment_status: 'paid', status: 'active' })
        .or(`order_number.eq.${formattedOrderNo},order_number.eq.${merchant_oid}`)
    } else {
      await supabase
        .from('orders')
        .update({ payment_status: 'failed' })
        .or(`order_number.eq.${formattedOrderNo},order_number.eq.${merchant_oid}`)
    }

    // PayTR mutlaka düz metin "OK" cevabı bekler
    return new NextResponse('OK', { status: 200 })
  } catch {
    return new NextResponse('ERROR', { status: 500 })
  }
}