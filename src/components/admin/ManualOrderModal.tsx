// src/components/admin/ManualOrderModal.tsx
'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { X, Save, UserCheck, MessageSquarePlus } from 'lucide-react'

interface Props {
  packages: any[]
  districts: any[]
  neighborhoods: any[]
  existingCustomers: any[]
  onClose: () => void
  onSuccess: () => void
}

const WEEKDAY_OPTIONS = [
  { day: 1, label: 'Pzt' },
  { day: 2, label: 'Sal' },
  { day: 3, label: 'Çar' },
  { day: 4, label: 'Per' },
  { day: 5, label: 'Cum' },
  { day: 6, label: 'Cmt' },
]

export default function ManualOrderModal({
  packages,
  districts,
  neighborhoods,
  existingCustomers,
  onClose,
  onSuccess,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [matchedBadge, setMatchedBadge] = useState(false)

  // Müşteri Bilgileri
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [districtId, setDistrictId] = useState<number>(districts[0]?.id || 0)
  const [neighborhoodId, setNeighborhoodId] = useState<number>(0)
  const [fullAddress, setFullAddress] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')

  // Paket & Takvim Bilgileri
  const [packageId, setPackageId] = useState<string>(packages[0]?.id || '')
  const [durationDays, setDurationDays] = useState<number>(14)
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [deliveryScheduleType, setDeliveryScheduleType] = useState<string>('every_day_sat_double')
  const [excludedWeekdays, setExcludedWeekdays] = useState<number[]>([])

  // Diyetisyen, Operasyon & Ödeme
  const [dietitianNote, setDietitianNote] = useState('1500 Kcal')
  const [orderNote, setOrderNote] = useState('')
  const [specialOpsNote, setSpecialOpsNote] = useState('')
  const [grandTotal, setGrandTotal] = useState<string>('0')
  const [balanceDue, setBalanceDue] = useState<string>('0')
  const [paymentMethod, setPaymentMethod] = useState<string>('eft')

  const filteredNeighborhoods = useMemo(
    () => neighborhoods.filter((n) => n.district_id === districtId && n.is_active),
    [neighborhoods, districtId]
  )

  const handlePhoneBlur = () => {
    const clean = customerPhone.replace(/\D/g, '').slice(-10)
    if (clean.length < 7) return
    const found = existingCustomers.find((c) =>
      String(c.phone || '')
        .replace(/\D/g, '')
        .endsWith(clean)
    )
    if (found) {
      setCustomerName(found.name || '')
      setCustomerEmail(found.email || '')
      setFullAddress(found.address || '')
      if (found.height) setHeightCm(String(found.height))
      if (found.weight) setWeightKg(String(found.weight))
      if (found.notes) setOrderNote(found.notes)

      const dMatch = districts.find(
        (d) => d.name.toLowerCase() === String(found.district || '').toLowerCase()
      )
      if (dMatch) {
        setDistrictId(dMatch.id)
        const nMatch = neighborhoods.find(
          (n) =>
            n.district_id === dMatch.id &&
            n.name.toLowerCase() === String(found.neighborhood || '').toLowerCase()
        )
        if (nMatch) setNeighborhoodId(nMatch.id)
      }
      setMatchedBadge(true)
    } else {
      setMatchedBadge(false)
    }
  }

  const toggleExcludedDay = (d: number) => {
    setExcludedWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const selPkg = packages.find((p) => String(p.id) === String(packageId))
    const selDist = districts.find((d) => d.id === districtId)
    const selNeigh =
      filteredNeighborhoods.find((n) => n.id === neighborhoodId) || filteredNeighborhoods[0]

    setSaving(true)
    try {
      const res = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_manual_order',
          payload: {
            customerName,
            customerPhone,
            customerEmail,
            cityName: 'İstanbul',
            districtName: selDist?.name || '',
            neighborhoodId: selNeigh?.id || null,
            neighborhoodName: selNeigh?.name || '',
            fullAddress,
            packageId: selPkg?.id || null,
            packageTitle: selPkg ? `${selPkg.title} (${durationDays} Günlük)` : 'Özel Paket',
            durationDays,
            deliveryScheduleType,
            excludedWeekdays,
            startDate,
            grandTotal: Number(grandTotal) || 0,
            balanceDue: Number(balanceDue) || 0,
            paymentMethod,
            heightCm,
            weightKg,
            dietitianNote,
            orderNote,
            specialOpsNote,
            source: 'whatsapp',
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Sipariş oluşturulamadı.')
        return
      }
      alert(
        `WhatsApp siparişi oluşturuldu!\nSipariş No: ${data.orderNumber}\nBitiş Tarihi: ${data.estimatedEndDate} (${data.totalDeliveryDays} Sevkiyat Günü)`
      )
      onSuccess()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 max-h-[92vh] overflow-y-auto shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                WhatsApp / Manuel Sipariş &amp; Üye Ekle
              </h3>
              <p className="text-xs text-slate-500">
                Tek ekrandan hem müşteri kaydı hem teslimat takvimi otomatik oluşturulur.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. MÜŞTERİ & ADRES */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 uppercase">
              1. Müşteri &amp; Adres Bilgileri
            </span>
            {matchedBadge && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                <UserCheck className="w-3.5 h-3.5" /> Kayıtlı üye bulundu, bilgiler dolduruldu
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Telefon * (Yazınca eski üyeyi arar)
              </label>
              <input
                type="tel"
                required
                placeholder="05XX XXX XX XX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                onBlur={handlePhoneBlur}
                className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Ad Soyad *</label>
              <input
                type="text"
                required
                placeholder="Örn: Atilla Aydın"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                E-Posta (Opsiyonel)
              </label>
              <input
                type="email"
                placeholder="opsiyonel@mail.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">İlçe *</label>
              <select
                value={districtId}
                onChange={(e) => {
                  const id = Number(e.target.value)
                  setDistrictId(id)
                  const firstN = neighborhoods.find((n) => n.district_id === id && n.is_active)
                  setNeighborhoodId(firstN?.id || 0)
                }}
                className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs"
              >
                {districts
                  .filter((d) => d.is_active)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.side})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Mahalle *</label>
              <select
                value={neighborhoodId}
                onChange={(e) => setNeighborhoodId(Number(e.target.value))}
                className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs"
              >
                {filteredNeighborhoods.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Boy (cm)</label>
                <input
                  type="number"
                  placeholder="170"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Kilo (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="72"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Açık Teslimat Adresi *
              </label>
              <input
                type="text"
                required
                placeholder="Sokak, bina, daire, kurye tarif notu..."
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>
        </div>

        {/* 2. PAKET, TAKVİM VE HARİÇ GÜNLER */}
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-3">
          <span className="text-xs font-extrabold text-emerald-950 uppercase block">
            2. Paket &amp; Teslimat Takvimi
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Paket *</label>
              <select
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs font-bold"
              >
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Gün Sayısı *
              </label>
              <input
                type="number"
                min={1}
                max={90}
                required
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Başlangıç Tarihi *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Teslimat Planı
              </label>
              <select
                value={deliveryScheduleType}
                onChange={(e) => setDeliveryScheduleType(e.target.value)}
                className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs"
              >
                <option value="every_day_sat_double">Her Gün (H.Sonu Dahil • C.tesi 2 Paket)</option>
                <option value="except_sunday">Pazar Hariç (Pzt - Cmt 1 Paket)</option>
                <option value="weekdays_only">Hafta Sonu Hariç (Pzt - Cuma)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Özel Hariç Günler (Varsa İşaretleyin — Örn: Çar/Cum Hariç)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_OPTIONS.map((w) => {
                  const active = excludedWeekdays.includes(w.day)
                  return (
                    <button
                      key={w.day}
                      type="button"
                      onClick={() => toggleExcludedDay(w.day)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer transition ${
                        active
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-red-400'
                      }`}
                    >
                      {w.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 3. DİYETİSYEN NOTU, ALERJEN & BAKİYE */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Kalori / Diyetisyen Notu
            </label>
            <input
              type="text"
              placeholder="Örn: 1800 Kcal • Laktozsuz • Kahvaltısız"
              value={dietitianNote}
              onChange={(e) => setDietitianNote(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Alerjen / Mutfak Kısıt Notu
            </label>
            <input
              type="text"
              placeholder="Örn: Domates, kılçıklı balık yemez, tuzsuz"
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Özel Not (Juice / Telafi Öğün)
            </label>
            <input
              type="text"
              placeholder="Örn: 12-13 Aralık Juice / +1 Telafi Öğle"
              value={specialOpsNote}
              onChange={(e) => setSpecialOpsNote(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Toplam Sipariş Tutarı (TL)
            </label>
            <input
              type="number"
              value={grandTotal}
              onChange={(e) => setGrandTotal(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-red-700 mb-1">
              Kalan Bakiye (TL) — Ödendiyse 0 bırakın
            </label>
            <input
              type="number"
              value={balanceDue}
              onChange={(e) => setBalanceDue(e.target.value)}
              className="w-full border border-red-300 bg-red-50/40 rounded-xl px-3 py-2 text-xs font-extrabold text-red-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Ödeme Türü</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
            >
              <option value="eft">Havale / EFT</option>
              <option value="paytr">Kredi Kartı (PayTR / Link)</option>
              <option value="cash">Nakit / Kapıda</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Oluşturuluyor...' : 'Üye & Siparişi Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}