// src/app/api/paytr/token/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      orderNumber,
      email,
      grandTotal,
      customerName,
      fullAddress,
      phone,
      packageTitle,
      quantity = 1,
    } = body

    const supabase = createAdminClient()
    const { data: posRow } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'pos_config')
      .single()

    const pos = posRow?.value || {}
    const merchant_id = process.env.PAYTR_MERCHANT_ID || pos.paytr_merchant_id || ''
    const merchant_key = process.env.PAYTR_MERCHANT_KEY || pos.paytr_merchant_key || ''
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT || pos.paytr_merchant_salt || ''
    const test_mode =
      process.env.PAYTR_TEST_MODE === '1' || pos.paytr_test_mode === true ? '1' : '0'

    if (!merchant_id || !merchant_key || !merchant_salt) {
      return NextResponse.json(
        { error: 'PayTR mağaza bilgileri (.env / Admin) henüz tanımlanmamış.' },
        { status: 400 }
      )
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dietbox-web.vercel.app').replace(
      /\/$/,
      ''
    )

    // PayTR merchant_oid yalnızca alfanümerik olmalıdır
    const merchant_oid = String(orderNumber).replace(/[^a-zA-Z0-9]/g, '')
    const payment_amount = String(Math.round(Number(grandTotal) * 100)) // Kuruş cinsinden
    const user_ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'

    const basket = [[packageTitle || 'DietBox Diyet Paketi', String(grandTotal), Number(quantity)]]
    const user_basket = Buffer.from(JSON.stringify(basket)).toString('base64')

    const no_installment = '0'
    const max_installment = '0'
    const currency = 'TL'

    const hash_str =
      merchant_id +
      user_ip +
      merchant_oid +
      email +
      payment_amount +
      user_basket +
      no_installment +
      max_installment +
      currency +
      test_mode

    const paytr_token = crypto
      .createHmac('sha256', merchant_key)
      .update(hash_str + merchant_salt)
      .digest('base64')

    const formData = new URLSearchParams({
      merchant_id,
      user_ip,
      merchant_oid,
      email,
      payment_amount,
      paytr_token,
      user_basket,
      debug_on: test_mode,
      no_installment,
      max_installment,
      user_name: customerName || 'DietBox Üyesi',
      user_address: fullAddress || 'İstanbul',
      user_phone: phone || '05000000000',
      merchant_ok_url: `${siteUrl}/odeme?paytr=ok&order=${encodeURIComponent(orderNumber)}`,
      merchant_fail_url: `${siteUrl}/odeme?paytr=fail&order=${encodeURIComponent(orderNumber)}`,
      timeout_limit: '30',
      currency,
      test_mode,
      lang: 'tr',
    })

    const paytrRes = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    const paytrData = await paytrRes.json()

    if (paytrData.status !== 'success') {
      return NextResponse.json(
        { error: paytrData.reason || 'PayTR ödeme oturumu başlatılamadı.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ token: paytrData.token })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'PayTR bağlantı hatası' },
      { status: 500 }
    )
  }
}