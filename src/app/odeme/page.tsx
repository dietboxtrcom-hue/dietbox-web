// src/app/odeme/page.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { addDays, format, isSunday, parseISO, subDays } from 'date-fns'
import { tr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { formatTRY } from '@/lib/pricing-engine'
import {
  getIstanbulNow,
  getEarliestStartDate,
  getDeliveryCountdownInfo,
  generateDeliverySchedule,
} from '@/lib/calendar-engine'
import { DeliveryScheduleType } from '@/types/database'
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  Clock,
  Landmark,
  ShieldCheck,
  ArrowLeft,
  Truck,
  UserCheck,
  Info,
  X,
} from 'lucide-react'
import PineappleIcon from '@/components/PineappleIcon'

export default function CheckoutPage() {
  const [draft, setDraft] = useState<any>(null)
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [minPrepDays, setMinPrepDays] = useState<number>(2)
  const [loggedUserId, setLoggedUserId] = useState<string | null>(null)
  const [autoFilled, setAutoFilled] = useState(false)

  const [posConfig, setPosConfig] = useState<any>({
    paytr_active: true,
    bank_transfer_active: true,
    ziraat_active: false,
    bank_accounts: [
      {
        id: 'bank-ziraat-1',
        bank_name: 'ZİRAAT BANKASI',
        account_name: 'MESA TÜKETİM MADDELERİ GIDA İNŞAAT ENERJİ SAN. VE TİC. LTD. ŞTİ.',
        iban: 'TR63 0001 0014 3997 9194 0750 01',
      },
    ],
    bank_transfer_instructions:
      'Lütfen Havale / EFT açıklamasına sipariş numaranızı yazınız.',
  })

  // Canlı Saat & Geri Sayım State (Hydration güvenli)
  const [mounted, setMounted] = useState(false)
  const [nowTick, setNowTick] = useState<Date>(() => new Date())

  // Form State
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [fullAddress, setFullAddress] = useState('')

  // Teslimat Günleri & Takvim State
  const [scheduleType, setScheduleType] = useState<DeliveryScheduleType>('every_day_sat_double')
  const [startDate, setStartDate] = useState<string>('')

  // Boy / Kilo & Özel Not
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [orderNote, setOrderNote] = useState('')

  // Fatura Türü
  const [invoiceType, setInvoiceType] = useState<'individual' | 'corporate'>('individual')
  const [tcNo, setTcNo] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [taxOffice, setTaxOffice] = useState('')
  const [taxNo, setTaxNo] = useState('')

  // Ödeme Yöntemi & PayTR iFrame
  const [paymentMethod, setPaymentMethod] = useState<'ziraat' | 'paytr' | 'iyzico' | 'eft'>('paytr')
  const [paytrIframeToken, setPaytrIframeToken] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<{
    orderNumber: string
    estimatedEndDate: string
    totalDeliveryDays: number
  } | null>(null)

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => setNowTick(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem('dietbox_checkout_draft')
    let parsedDraft: any = null
    if (saved) {
      parsedDraft = JSON.parse(saved)
      setDraft(parsedDraft)
      if (parsedDraft.prefillHeight) setHeightCm(parsedDraft.prefillHeight)
      if (parsedDraft.prefillWeight) setWeightKg(parsedDraft.prefillWeight)
    }

    const fetchInitialData = async () => {
      const supabase = createClient()
      const [{ data: blocks }, { data: rules }, { data: posRes }, { data: userRes }] =
        await Promise.all([
          supabase.from('calendar_blocks').select('blocked_date'),
          supabase.from('system_settings').select('value').eq('key', 'delivery_rules').single(),
          supabase.from('system_settings').select('value').eq('key', 'pos_config').single(),
          supabase.auth.getUser(),
        ])

      const blockedList = (blocks || []).map((b) => b.blocked_date)
      setBlockedDates(blockedList)

      if (posRes?.value) {
        setPosConfig((prev: any) => ({ ...prev, ...posRes.value }))
        if (posRes.value.paytr_active === false && posRes.value.bank_transfer_active) {
          setPaymentMethod('eft')
        }
      }

      const prep = rules?.value?.min_prep_days ?? 2
      setMinPrepDays(prep)

      const earliest = getEarliestStartDate(prep, blockedList, new Date())
      setStartDate(format(earliest, 'yyyy-MM-dd'))

      if (userRes?.user) {
        const u = userRes.user
        setLoggedUserId(u.id)

        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', u.id)
          .single()

        const fullNameStr = (prof?.full_name || u.user_metadata?.full_name || '').trim()

        if (fullNameStr) {
          const parts = fullNameStr.split(/\s+/)
          setFirstName(parts[0] || '')
          setLastName(parts.slice(1).join(' ') || '')
        }

        if (prof?.email || u.email) setEmail(prof?.email || u.email || '')
        if (prof?.phone || u.user_metadata?.phone) {
          setPhone(prof?.phone || u.user_metadata?.phone || '')
        }
        if (prof?.full_address) setFullAddress(prof.full_address)
        if (prof?.height_cm && !parsedDraft?.prefillHeight) setHeightCm(String(prof.height_cm))
        if (prof?.weight_kg && !parsedDraft?.prefillWeight) setWeightKg(String(prof.weight_kg))
        if (prof?.allergies) setOrderNote(prof.allergies)

        if (prof?.invoice_type === 'corporate') setInvoiceType('corporate')
        if (prof?.tc_no) setTcNo(prof.tc_no)
        if (prof?.company_name) setCompanyName(prof.company_name)
        if (prof?.tax_office) setTaxOffice(prof.tax_office)
        if (prof?.tax_no) setTaxNo(prof.tax_no)

        setAutoFilled(true)
      }
    }

    fetchInitialData()
  }, [])

  const countdown = useMemo(
    () => getDeliveryCountdownInfo(minPrepDays, blockedDates, nowTick),
    [minPrepDays, blockedDates, nowTick]
  )

  const hourBucket = format(nowTick, 'yyyy-MM-dd-HH')
  const allowSundayStart = scheduleType === 'every_day_sat_double'

  const calendarDays = useMemo(() => {
    const now = new Date()
    const { istanbulDayStart } = getIstanbulNow(now)
    const earliest = getEarliestStartDate(minPrepDays, blockedDates, now)
    const days = []

    for (let i = 0; i < 18; i++) {
      const d = addDays(istanbulDayStart, i)
      const dateStr = format(d, 'yyyy-MM-dd')
      const isPrepLocked = d < earliest
      const isSun = isSunday(d)
      const prevSatStr = format(subDays(d, 1), 'yyyy-MM-dd')
      const isPrevSatBlocked = isSun && blockedDates.includes(prevSatStr)
      const isHoliday = blockedDates.includes(dateStr) || isPrevSatBlocked
      const isSundayBlocked = isSun && !allowSundayStart
      const disabled = isPrepLocked || isSundayBlocked || isHoliday

      let reason = ''
      if (isPrepLocked) reason = 'Hazırlık Süresi (Kapalı)'
      else if (isSundayBlocked) reason = 'Bu planda Pazar başlangıç kapalıdır'
      else if (isHoliday) reason = 'Özel Gün / Kota Dolu'
      else if (isSun) reason = 'Pazar Başlangıç (Teslimat Cumartesi Sabahı Yapılır)'

      days.push({
        date: d,
        dateStr,
        dayNum: format(d, 'd'),
        dayName: format(d, 'EEE', { locale: tr }),
        monthName: format(d, 'MMM', { locale: tr }),
        isSun,
        disabled,
        reason,
      })
    }
    return days
  }, [minPrepDays, blockedDates, hourBucket, allowSundayStart])

  // Saat 12:00 geçişinde veya teslimat planı değiştiğinde seçili tarih kapandıysa otomatik kaydır
  useEffect(() => {
    if (!startDate) return
    const latestEarliest = format(
      getEarliestStartDate(minPrepDays, blockedDates, new Date()),
      'yyyy-MM-dd'
    )
    if (startDate < latestEarliest) {
      setStartDate(latestEarliest)
      return
    }
    if (!allowSundayStart && isSunday(parseISO(startDate))) {
      setStartDate(format(addDays(parseISO(startDate), 1), 'yyyy-MM-dd'))
    }
  }, [hourBucket, minPrepDays, blockedDates, startDate, allowSundayStart])

  const isSundaySelected = useMemo(() => {
    if (!startDate) return false
    return isSunday(parseISO(startDate))
  }, [startDate])

  const sundayDeliverySatLabel = useMemo(() => {
    if (!isSundaySelected || !startDate) return ''
    return format(subDays(parseISO(startDate), 1), 'd MMMM EEEE', { locale: tr })
  }, [isSundaySelected, startDate])

  const deliveryPreview = useMemo(() => {
    if (!startDate || !draft) return null
    return generateDeliverySchedule(startDate, draft.durationDays, scheduleType, blockedDates)
  }, [startDate, draft, scheduleType, blockedDates])

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft || !startDate) return

    // Son saniye 12:00 kesim saati güvenlik kontrolü
    const latestEarliest = format(
      getEarliestStartDate(minPrepDays, blockedDates, new Date()),
      'yyyy-MM-dd'
    )
    if (startDate < latestEarliest) {
      setStartDate(latestEarliest)
      alert(
        `Saat 12:00 kesim saati geçtiği için ilk teslimat tarihiniz otomatik olarak ${latestEarliest} olarak güncellendi. Lütfen kontrol edip tekrar onaylayın.`
      )
      return
    }

    setSubmitting(true)
    try {
      const fullName = `${firstName} ${lastName}`.trim()

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: loggedUserId,
          customerName: fullName,
          customerPhone: phone,
          customerEmail: email,
          cityName: draft.cityName,
          districtName: draft.districtName,
          neighborhoodId: draft.neighborhoodId,
          neighborhoodName: draft.neighborhoodName,
          fullAddress,
          packageId: draft.packageId,
          packageTitle: draft.packageTitle,
          durationDays: draft.durationDays,
          deliveryScheduleType: scheduleType,
          startDate,
          packageSubtotal: draft.priceBreakdown.packageSubtotal,
          logisticsFeeTotal: draft.priceBreakdown.logisticsFeeTotal,
          addonsTotal: draft.priceBreakdown.addonsTotal,
          grandTotal: draft.priceBreakdown.grandTotal,
          paymentMethod,
          heightCm,
          weightKg,
          orderNote,
          invoiceType,
          invoiceDetails:
            invoiceType === 'individual' ? { tcNo } : { companyName, taxOffice, taxNo },
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Sipariş oluşturulurken bir hata oluştu.')
        setSubmitting(false)
        return
      }

      if (loggedUserId) {
        try {
          const supabase = createClient()
          let matchedDistrictId: number | null = draft.districtId ? Number(draft.districtId) : null
          const matchedCityId: number | null = draft.cityId ? Number(draft.cityId) : null

          if (draft.neighborhoodId && !matchedDistrictId) {
            const { data: nRow } = await supabase
              .from('neighborhoods')
              .select('district_id')
              .eq('id', draft.neighborhoodId)
              .single()
            if (nRow?.district_id) matchedDistrictId = nRow.district_id
          }

          await supabase.from('profiles').upsert(
            {
              id: loggedUserId,
              full_name: fullName,
              email,
              phone,
              city: draft.cityName || 'İstanbul',
              city_id: matchedCityId || 1,
              district: draft.districtName || '',
              district_id: matchedDistrictId,
              neighborhood: draft.neighborhoodName || '',
              neighborhood_id: draft.neighborhoodId ? Number(draft.neighborhoodId) : null,
              full_address: fullAddress,
              height_cm: heightCm ? Number(heightCm) : null,
              weight_kg: weightKg ? Number(weightKg) : null,
              allergies: orderNote || null,
              invoice_type: invoiceType,
              tc_no: invoiceType === 'individual' ? tcNo : null,
              company_name: invoiceType === 'corporate' ? companyName : null,
              tax_office: invoiceType === 'corporate' ? taxOffice : null,
              tax_no: invoiceType === 'corporate' ? taxNo : null,
            },
            { onConflict: 'id' }
          )

          const wNum = Number(weightKg)
          if (wNum >= 30 && wNum <= 250) {
            const { count } = await supabase
              .from('weight_logs')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', loggedUserId)

            if (!count || count === 0) {
              await supabase.from('weight_logs').insert({
                user_id: loggedUserId,
                weight_kg: wNum,
                measured_at: new Date().toISOString().slice(0, 10),
                note: `İlk paket başlangıç kilosu (${draft.packageTitle})`,
              })
            }
          }
        } catch {
          // Profil senkronizasyonu sipariş onayını engellemesin
        }
      }

      sessionStorage.removeItem('dietbox_checkout_draft')

      if (paymentMethod === 'paytr') {
        const payRes = await fetch('/api/paytr/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: data.orderNumber,
            email,
            grandTotal: draft.priceBreakdown.grandTotal,
            customerName: fullName,
            fullAddress,
            phone,
            packageTitle: draft.packageTitle,
            quantity: draft.quantity || 1,
          }),
        })
        const payData = await payRes.json()
        if (!payRes.ok || !payData.token) {
          alert(payData.error || 'PayTR ödeme oturumu başlatılamadı.')
          setSubmitting(false)
          return
        }
        setPaytrIframeToken(payData.token)
        setSubmitting(false)
        return
      }

      setCompletedOrder({
        orderNumber: data.orderNumber,
        estimatedEndDate: data.estimatedEndDate,
        totalDeliveryDays: data.totalDeliveryDays,
      })
    } catch {
      alert('Bağlantı hatası oluştu.')
    } finally {
      setSubmitting(false)
    }
  }

  if (completedOrder) {
    return (
      <main className="min-h-screen bg-slate-50 py-16 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-emerald-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
              Siparişiniz Onaylandı
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900">Teşekkürler, {firstName}!</h1>
            <p className="text-sm text-slate-600">
              Sipariş numaranız: <strong className="text-slate-900">{completedOrder.orderNumber}</strong>.
              Onay e-postası adresinize gönderilmiştir.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Paket Başlangıç Tarihi:</span>
              <span className="font-bold text-slate-900">{startDate}</span>
            </div>
            {isSundaySelected && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Pazar gününün ilk paketi <strong>{sundayDeliverySatLabel}</strong> sabahı teslim edilecektir.
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Son Teslimat (Bitiş) Tarihi:</span>
              <span className="font-bold text-emerald-700">{completedOrder.estimatedEndDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Toplam Kurye Teslimat Günü:</span>
              <span className="font-bold text-slate-900">{completedOrder.totalDeliveryDays} Gün</span>
            </div>
          </div>

          {paymentMethod === 'eft' && Array.isArray(posConfig.bank_accounts) && posConfig.bank_accounts.length > 0 && (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 text-left space-y-3 text-xs">
              <strong className="text-slate-900 block">Havale / EFT Hesap Bilgileri:</strong>
              {posConfig.bank_accounts.map((acc: any, idx: number) => (
                <div key={acc.id || idx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-0.5">
                  <p className="font-extrabold text-slate-900">{acc.bank_name}</p>
                  <p className="text-slate-600">{acc.account_name}</p>
                  <p className="font-mono font-bold text-emerald-700">{acc.iban}</p>
                </div>
              ))}
              {posConfig.bank_transfer_instructions && (
                <p className="text-slate-600 leading-relaxed">{posConfig.bank_transfer_instructions}</p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/hesabim"
              className="flex-1 bg-[#0d1f18] hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-sm transition"
            >
              Siparişimi &amp; Gelişimimi Gör
            </Link>
            <Link
              href="/"
              className="flex-1 bg-[#51a885] hover:bg-[#3f8d6d] text-white font-semibold py-3 px-4 rounded-xl text-sm transition"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (!draft) {
    return (
      <main className="min-h-screen bg-slate-50 py-20 px-4 text-center space-y-4">
        <p className="text-slate-600 font-medium">Sepetinizde henüz seçilmiş bir diyet paketi bulunmuyor.</p>
        <Link
          href="/paketler"
          className="inline-flex items-center gap-2 bg-[#51a885] text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Paketleri İncele
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      {paytrIframeToken && (
        <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <strong className="text-sm font-extrabold text-slate-900">
                PayTR Güvenli 3D Ödeme Ekranı
              </strong>
              <button
                type="button"
                onClick={() => setPaytrIframeToken(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-red-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <iframe
              src={`https://www.paytr.com/odeme/guvenli/${paytrIframeToken}`}
              className="w-full h-[540px] rounded-xl border border-slate-200"
              frameBorder="0"
            />
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/paketler/${draft.packageSlug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Paket Seçimine Geri Dön
          </Link>

          {autoFilled && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3.5 py-1.5 rounded-full">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Üyelik bilgileriniz otomatik dolduruldu
            </span>
          )}
        </div>

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* SOL SÜTUN */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. PAKET BAŞLANGIÇ TARİHİ */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  Paket Başlangıç Tarihi ve Teslimat Günleri
                </h2>
                <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md font-medium">
                  Hafta İçi 12:00&apos;ye Kadar Ertesi Gün Başlangıç
                </span>
              </div>

              {/* CANLI SEVKİYAT GERİ SAYIM BANNERI */}
              {mounted && (
                <div
                  className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    countdown.isBeforeCutoff
                      ? 'bg-[#0d1f18] text-white border-emerald-700/60 shadow-md'
                      : 'bg-amber-50 text-amber-950 border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        countdown.isBeforeCutoff
                          ? 'bg-[#eab130] text-slate-950'
                          : 'bg-amber-200/80 text-amber-900'
                      }`}
                    >
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 text-xs">
                      {countdown.isBeforeCutoff ? (
                        <>
                          <p className="font-extrabold text-sm">
                            {countdown.isTomorrow
                              ? 'Yarın Sabah Kapınızda!'
                              : `En Erken Başlangıç: ${countdown.earliestDateLabel}`}
                          </p>
                          <p className="text-white/80 leading-relaxed">
                            Saat 12:00&apos;ye kadar siparişinizi tamamlarsanız ilk teslimatınız{' '}
                            <strong className="text-[#eab130]">{countdown.earliestDateLabel}</strong>{' '}
                            sabahı başlar. 12:00 sonrası siparişlerde ilk teslimat{' '}
                            <strong>{countdown.nextDayLabel}</strong> gününe kayar.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-extrabold text-sm">
                            İlk Açık Teslimat: {countdown.earliestDateLabel}
                          </p>
                          <p className="text-amber-900/80 leading-relaxed">
                            {countdown.isSundayToday
                              ? 'Pazar günleri mutfağımız kapalıdır. Bugün verilen siparişlerin sevkiyatı Salı sabahı başlar.'
                              : `Bugün saat 12:00 kesim saati geçtiği için mutfak planlaması tamamlandı. Şu an vereceğiniz siparişler en erken ${countdown.earliestDateLabel} sabahı kapınızda!`}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {countdown.isBeforeCutoff && (
                    <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2 text-center shrink-0">
                      <span className="block text-[10px] uppercase tracking-wider text-white/60 font-bold">
                        Kalan Süre (TR Saati)
                      </span>
                      <strong className="font-mono text-base font-black text-[#eab130]">
                        {countdown.remainingFormatted}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Paket Başlangıç Tarihinizi Seçin <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {calendarDays.map((item) => {
                    const isSelected = startDate === item.dateStr
                    return (
                      <button
                        key={item.dateStr}
                        type="button"
                        disabled={item.disabled}
                        onClick={() => setStartDate(item.dateStr)}
                        title={item.reason}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                          item.disabled
                            ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-md font-bold cursor-pointer'
                            : item.isSun
                            ? 'bg-amber-50/60 border-amber-300 hover:border-emerald-500 text-slate-800 cursor-pointer'
                            : 'bg-white border-slate-200 hover:border-emerald-500 text-slate-800 cursor-pointer'
                        }`}
                      >
                        <span className="text-[10px] uppercase opacity-80">{item.dayName}</span>
                        <span className="text-lg font-extrabold leading-tight">{item.dayNum}</span>
                        <span className="text-[10px]">{item.monthName}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* PAZAR BAŞLANGIÇ SEÇİLDİĞİNDE CUMARTESİ TESLİMAT UYARISI */}
              {isSundaySelected && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-950">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Önemli Teslimat Bilgisi:</strong> Pazar günleri kurye dağıtımı yapılmadığı
                    için, Pazar başlangıçlı paketinizin ilk günü{' '}
                    <strong className="underline">{sundayDeliverySatLabel} sabahı</strong> adresinize
                    teslim edilecektir.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  Teslimat Günleri <span className="text-red-500">*</span>
                </label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value as DeliveryScheduleType)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-3 text-sm text-slate-800"
                >
                  <option value="every_day_sat_double">
                    Her gün ( C.tesi 2 paket - C.tesi ve Pazar )
                  </option>
                  <option value="weekdays_only">Sadece Hafta İçi (Pazartesi - Cuma)</option>
                  <option value="except_sunday">Pazar Hariç (Pazartesi - Cumartesi 1 Paket)</option>
                </select>
              </div>

              {deliveryPreview && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-950">
                  <div className="flex items-center gap-2">
                    <PineappleIcon className="w-4 h-4" />
                    <span>
                      <strong>{draft.durationDays} Günlük</strong> paketiniz{' '}
                      <strong>{startDate}</strong> tarihinde başlayıp{' '}
                      <strong>{deliveryPreview.estimatedEndDate}</strong> tarihinde tamamlanacaktır.
                    </span>
                  </div>
                  <span className="bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-md">
                    {deliveryPreview.deliveries.length} Sevkiyat Günü
                  </span>
                </div>
              )}
            </div>

            {/* 2. KİŞİSEL BİLGİLER, ADRES VE BOY/KİLO */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900">Teslimat ve Kişisel Bilgiler</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adınız <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Soyadınız <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefon Numaranız <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="05XX XXX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-Posta Adresiniz <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  Seçilen Sevkiyat Bölgesi:{' '}
                  <strong className="text-slate-900">
                    {draft.cityName} / {draft.side} / {draft.districtName} / {draft.neighborhoodName}
                  </strong>
                </span>
                <Link href={`/paketler/${draft.packageSlug}`} className="text-emerald-600 font-bold hover:underline">
                  Değiştir
                </Link>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Açık Teslimat Adresiniz <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Boyunuz (Cm) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kilonuz (Kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sipariş ve Alerjen Notunuz (İsteğe Bağlı)
                </label>
                <textarea
                  rows={2}
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            {/* 3. FATURA BİLGİLERİ */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900">Fatura Bilgileri</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fatura Türü <span className="text-red-500">*</span>
                </label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as 'individual' | 'corporate')}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                >
                  <option value="individual">Bireysel</option>
                  <option value="corporate">Kurumsal (Şirket Faturası)</option>
                </select>
              </div>

              {invoiceType === 'individual' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    T.C. Kimlik Numarası <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    required
                    value={tcNo}
                    onChange={(e) => setTcNo(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Firma Ünvanı"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Vergi Dairesi"
                    value={taxOffice}
                    onChange={(e) => setTaxOffice(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Vergi Numarası"
                    value={taxNo}
                    onChange={(e) => setTaxNo(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* SAĞ SÜTUN: SİPARİŞ ÖZETİ */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg space-y-5">
              <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                SİPARİŞİNİZ
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-bold text-slate-900">
                      {draft.packageTitle} × {draft.quantity}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bölge: {draft.districtName} / {draft.neighborhoodName}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900">
                    {formatTRY(draft.priceBreakdown.packageSubtotal)}
                  </span>
                </div>

                {draft.priceBreakdown.customizationTotal !== undefined &&
                  draft.priceBreakdown.customizationTotal !== 0 && (
                    <div className="flex justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <span>Paket Özelleştirme (Laktozsuz / Öğün Tercihi):</span>
                      <span className="font-semibold text-slate-900">
                        {draft.priceBreakdown.customizationTotal > 0 ? '+' : ''}
                        {formatTRY(draft.priceBreakdown.customizationTotal)}
                      </span>
                    </div>
                  )}

                <div className="flex justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <span>
                    {draft.districtName} / Mahalle Lojistik Ek Ücreti ({draft.durationDays} Gün):
                  </span>
                  <span className="font-semibold text-slate-900">
                    {formatTRY(draft.priceBreakdown.logisticsFeeTotal)}
                  </span>
                </div>

                {draft.priceBreakdown.addonsTotal > 0 && (
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Ekstra Detox / Ara Öğün Ürünleri:</span>
                    <span className="font-semibold text-slate-900">
                      {formatTRY(draft.priceBreakdown.addonsTotal)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-xs text-emerald-700 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-medium">
                    <Truck className="w-3.5 h-3.5" /> Gönderim:
                  </span>
                  <span className="font-bold">Özel Soğuk Zincir Kurye</span>
                </div>

                <div className="flex justify-between items-baseline pt-3 border-t border-slate-200">
                  <span className="text-base font-extrabold text-slate-900">Toplam</span>
                  <span className="text-2xl font-extrabold text-emerald-600">
                    {formatTRY(draft.priceBreakdown.grandTotal)}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ödeme Yöntemi Seçin
                </span>

                {posConfig.paytr_active !== false && (
                  <label
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                      paymentMethod === 'paytr'
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'paytr'}
                      onChange={() => setPaymentMethod('paytr')}
                    />
                    <CreditCard className="w-5 h-5 text-blue-600 shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-slate-900">
                        Kredi / Banka Kartı (PayTR 3D Secure)
                      </p>
                      <p className="text-slate-500">256-bit SSL güvenli kart ödemesi</p>
                    </div>
                  </label>
                )}

                {posConfig.ziraat_active && (
                  <label
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                      paymentMethod === 'ziraat'
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'ziraat'}
                      onChange={() => setPaymentMethod('ziraat')}
                    />
                    <CreditCard className="w-5 h-5 text-red-600 shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-slate-900">
                        Kredi / Banka Kartı (Ziraat Bankası 3D Secure)
                      </p>
                      <p className="text-slate-500">256-bit SSL güvenli ödeme</p>
                    </div>
                  </label>
                )}

                {posConfig.bank_transfer_active !== false && (
                  <div className="space-y-2">
                    <label
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                        paymentMethod === 'eft'
                          ? 'border-emerald-600 bg-emerald-50/50'
                          : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'eft'}
                        onChange={() => setPaymentMethod('eft')}
                      />
                      <Landmark className="w-5 h-5 text-slate-700 shrink-0" />
                      <div className="text-xs">
                        <p className="font-bold text-slate-900">Banka Havalesi / EFT</p>
                        <p className="text-slate-500">Sipariş numaranızla havale</p>
                      </div>
                    </label>

                    {paymentMethod === 'eft' &&
                      Array.isArray(posConfig.bank_accounts) &&
                      posConfig.bank_accounts.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                          {posConfig.bank_accounts.map((acc: any, idx: number) => (
                            <div
                              key={acc.id || idx}
                              className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-0.5"
                            >
                              <p className="font-extrabold text-slate-900">{acc.bank_name}</p>
                              <p className="text-slate-600 text-[11px]">{acc.account_name}</p>
                              <p className="font-mono font-bold text-emerald-700">{acc.iban}</p>
                            </div>
                          ))}
                          {posConfig.bank_transfer_instructions && (
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              {posConfig.bank_transfer_instructions}
                            </p>
                          )}
                        </div>
                      )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold py-4 px-6 rounded-xl transition cursor-pointer text-sm shadow-lg"
              >
                {submitting ? 'SİPARİŞİNİZ İŞLENİYOR...' : 'SİPARİŞİ ONAYLA'}
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Mesafeli Satış Sözleşmesi ve KVKK güvencesindedir.</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}