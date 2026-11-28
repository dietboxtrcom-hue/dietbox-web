// src/components/admin/MemberTrackingBoard.tsx
'use client'

import { useMemo, useState } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { formatTRY } from '@/lib/pricing-engine'
import { getShortPackageName, extractDietitianAndCalorieNote } from '@/lib/dispatch-excel'
import {
  Search,
  MessageSquarePlus,
  Edit3,
  CheckCircle2,
  Snowflake,
  AlertTriangle,
  Wallet,
  CalendarClock,
  Sparkles,
  X,
  Save,
} from 'lucide-react'

interface Props {
  orders: any[]
  deliveries: any[]
  onOpenManualOrder: () => void
  onRefresh: () => void
}

type BoardTab = 'ending' | 'starting' | 'frozen' | 'special' | 'balances'

const SCHEDULE_LABELS: Record<string, string> = {
  every_day_sat_double: 'H.Sonu Dahil',
  except_sunday: 'Pazar Hariç',
  weekdays_only: 'H.Sonu Hariç',
}

const WEEKDAY_NAMES: Record<number, string> = {
  1: 'Pzt',
  2: 'Sal',
  3: 'Çar',
  4: 'Per',
  5: 'Cum',
  6: 'Cmt',
}

export default function MemberTrackingBoard({
  orders,
  deliveries,
  onOpenManualOrder,
  onRefresh,
}: Props) {
  const [tab, setTab] = useState<BoardTab>('ending')
  const [search, setSearch] = useState('')
  const [scheduleFilter, setScheduleFilter] = useState<string>('all')
  const [editingOrder, setEditingOrder] = useState<any | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Her sipariş için kalan gün ve dondurulmuş gün sayısını hesapla
  const enrichedOrders = useMemo(() => {
    const delMap = new Map<string, any[]>()
    deliveries.forEach((d) => {
      const list = delMap.get(d.order_id) || []
      list.push(d)
      delMap.set(d.order_id, list)
    })

    return orders.map((o) => {
      const list = delMap.get(o.id) || []
      const remainingDeliveries = list.filter(
        (d) => d.status === 'scheduled' && d.delivery_date >= todayStr
      )
      const frozenDeliveries = list.filter((d) => d.status === 'frozen')
      const remainingDays = remainingDeliveries.reduce(
        (sum, d) => sum + Number(d.package_quantity || 1),
        0
      )
      const daysUntilEnd = o.estimated_end_date
        ? differenceInCalendarDays(parseISO(o.estimated_end_date), parseISO(todayStr))
        : 999

      return {
        ...o,
        shortPackage: getShortPackageName(o.package_title || ''),
        dietitianSummary: extractDietitianAndCalorieNote(o),
        remainingDays,
        frozenCount: frozenDeliveries.length,
        daysUntilEnd,
      }
    })
  }, [orders, deliveries, todayStr])

  const counts = useMemo(() => {
    return {
      ending: enrichedOrders.filter((o) => o.status === 'active' && o.daysUntilEnd >= -1).length,
      starting: enrichedOrders.filter((o) => o.start_date && o.start_date >= todayStr).length,
      frozen: enrichedOrders.filter((o) => o.frozenCount > 0 || o.status === 'frozen').length,
      special: enrichedOrders.filter(
        (o) =>
          (o.special_ops_note && o.special_ops_note.trim()) ||
          (Array.isArray(o.excluded_weekdays) && o.excluded_weekdays.length > 0)
      ).length,
      balances: enrichedOrders.filter((o) => Number(o.balance_due || 0) > 0).length,
      totalBalanceAmount: enrichedOrders.reduce((s, o) => s + Number(o.balance_due || 0), 0),
    }
  }, [enrichedOrders, todayStr])

  const visibleOrders = useMemo(() => {
    let list = [...enrichedOrders]

    if (tab === 'ending') {
      list = list
        .filter((o) => o.status === 'active' && o.daysUntilEnd >= -1)
        .sort((a, b) => (a.estimated_end_date || '').localeCompare(b.estimated_end_date || ''))
    } else if (tab === 'starting') {
      list = list
        .filter((o) => o.start_date && o.start_date >= todayStr)
        .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))
    } else if (tab === 'frozen') {
      list = list.filter((o) => o.frozenCount > 0 || o.status === 'frozen')
    } else if (tab === 'special') {
      list = list.filter(
        (o) =>
          (o.special_ops_note && o.special_ops_note.trim()) ||
          (Array.isArray(o.excluded_weekdays) && o.excluded_weekdays.length > 0)
      )
    } else if (tab === 'balances') {
      list = list
        .filter((o) => Number(o.balance_due || 0) > 0)
        .sort((a, b) => Number(b.balance_due || 0) - Number(a.balance_due || 0))
    }

    if (scheduleFilter !== 'all') {
      if (scheduleFilter === 'allergen') {
        list = list.filter((o) => Boolean((o.order_note || '').trim()))
      } else if (scheduleFilter === 'expiring3') {
        list = list.filter((o) => o.daysUntilEnd >= 0 && o.daysUntilEnd <= 3)
      } else {
        list = list.filter((o) => o.delivery_schedule_type === scheduleFilter)
      }
    }

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (o) =>
          (o.customer_name || '').toLowerCase().includes(q) ||
          (o.customer_phone || '').toLowerCase().includes(q) ||
          (o.shortPackage || '').toLowerCase().includes(q) ||
          (o.order_note || '').toLowerCase().includes(q) ||
          (o.dietitian_note || '').toLowerCase().includes(q) ||
          (o.special_ops_note || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [enrichedOrders, tab, scheduleFilter, search, todayStr])

  const handleSaveOpsEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOrder) return
    setSavingEdit(true)
    try {
      const res = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_order_ops',
          payload: {
            orderId: editingOrder.id,
            dietitian_note: editingOrder.dietitian_note || '',
            order_note: editingOrder.order_note || '',
            special_ops_note: editingOrder.special_ops_note || '',
            balance_due: Number(editingOrder.balance_due) || 0,
          },
        }),
      })
      if (res.ok) {
        setEditingOrder(null)
        onRefresh()
      } else {
        alert('Güncelleme başarısız.')
      }
    } finally {
      setSavingEdit(false)
    }
  }

  const handleClearBalance = async (orderId: string) => {
    if (!confirm('Bu üyenin kalan bakiyesini tahsil edildi (0 TL) olarak işaretlemek istiyor musunuz?'))
      return
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_order_ops',
        payload: { orderId, balance_due: 0 },
      }),
    })
    if (res.ok) onRefresh()
  }

  return (
    <div className="space-y-5">
      {/* ÜST BAŞLIK & WHATSAPP SİPARİŞ BUTONU */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Üye Takip Panosu (Başlangıç / Bitiş / Dondurma / Bakiye)
          </h2>
          <p className="text-xs text-slate-500">
            Tüm aktif üyeler bitiş tarihine göre sıralanır; WhatsApp siparişlerini tek ekrandan ekleyip takip edebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenManualOrder}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-3 rounded-xl inline-flex items-center gap-2 shadow-sm cursor-pointer transition"
        >
          <MessageSquarePlus className="w-4 h-4" />
          + WhatsApp / Manuel Sipariş Ekle
        </button>
      </div>

      {/* 5 ANA TAKİP SEKMESİ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: 'ending', label: 'Bitiş Takibi (Aktif)', count: counts.ending, icon: CalendarClock },
          { id: 'starting', label: 'Yeni Başlayacaklar', count: counts.starting, icon: Sparkles },
          { id: 'frozen', label: 'Donduranlar', count: counts.frozen, icon: Snowflake },
          { id: 'special', label: 'Juice / Telafi / Özel', count: counts.special, icon: AlertTriangle },
          {
            id: 'balances',
            label: `Bakiyesi Kalanlar (${formatTRY(counts.totalBalanceAmount)})`,
            count: counts.balances,
            icon: Wallet,
          },
        ].map((item) => {
          const Icon = item.icon
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as BoardTab)}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                active
                  ? 'bg-[#0d1f18] text-white border-[#0d1f18] shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${active ? 'text-[#eab130]' : 'text-emerald-600'}`} />
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.count}
                </span>
              </div>
              <span className="block text-xs font-bold mt-2 line-clamp-1">{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* ARAMA VE HIZLI FİLTRE ÇUBUĞU */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'all', label: 'Tümü' },
            { key: 'expiring3', label: 'Son 3 Gün' },
            { key: 'except_sunday', label: 'Pazar Hariç' },
            { key: 'weekdays_only', label: 'H.Sonu Hariç' },
            { key: 'allergen', label: 'Alerjeni Olanlar' },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setScheduleFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                scheduleFilter === f.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Üye adı, paket, alerjen, not ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs"
          />
        </div>
      </div>

      {/* CANLI ÜYE TAKİP TABLOSU */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <th className="p-3">Üye &amp; Telefon</th>
              <th className="p-3">Tarih Aralığı &amp; Kalan</th>
              <th className="p-3">Paket &amp; Plan</th>
              <th className="p-3">Diyetisyen / Kalori &amp; Alerjen</th>
              <th className="p-3">Özel Not / Bakiye</th>
              <th className="p-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleOrders.map((o) => {
              const excludedText =
                Array.isArray(o.excluded_weekdays) && o.excluded_weekdays.length > 0
                  ? o.excluded_weekdays.map((d: number) => WEEKDAY_NAMES[d] || d).join(', ') +
                    ' Hariç'
                  : ''
              return (
                <tr key={o.id} className="hover:bg-slate-50/70">
                  <td className="p-3">
                    <strong className="text-slate-900 text-sm block">{o.customer_name}</strong>
                    <span className="text-[11px] text-slate-500">
                      {o.customer_phone} • {o.district_name}
                    </span>
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    <span className="block font-bold text-slate-800">
                      {o.start_date} &rarr;{' '}
                      <span
                        className={
                          o.daysUntilEnd >= 0 && o.daysUntilEnd <= 3
                            ? 'text-red-600 font-black'
                            : 'text-emerald-700'
                        }
                      >
                        {o.estimated_end_date}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {o.duration_days} Günlük • <strong>{o.remainingDays} Gün Kaldı</strong>
                      {o.frozenCount > 0 && (
                        <span className="ml-1.5 text-blue-700 font-bold">
                          ({o.frozenCount} Dondurma)
                        </span>
                      )}
                    </span>
                  </td>

                  <td className="p-3">
                    <strong className="text-slate-900 block">{o.shortPackage}</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {SCHEDULE_LABELS[o.delivery_schedule_type] || 'H.Sonu Dahil'}
                      </span>
                      {excludedText && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                          {excludedText}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3 max-w-xs space-y-1">
                    {o.dietitianSummary !== '-' && (
                      <span className="block font-semibold text-emerald-800">
                        {o.dietitianSummary}
                      </span>
                    )}
                    {o.order_note && (
                      <span className="block bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-lg font-bold text-[11px]">
                        Alerjen: {o.order_note}
                      </span>
                    )}
                  </td>

                  <td className="p-3 space-y-1">
                    {o.special_ops_note && (
                      <span className="block bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-semibold text-[11px]">
                        {o.special_ops_note}
                      </span>
                    )}
                    {Number(o.balance_due || 0) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="bg-red-600 text-white font-extrabold px-2 py-0.5 rounded text-[11px]">
                          Bakiye: {formatTRY(o.balance_due)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleClearBalance(o.id)}
                          title="Tahsil Edildi Olarak İşaretle"
                          className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditingOrder({ ...o })}
                      className="bg-slate-900 hover:bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Not / Bakiye
                    </button>
                  </td>
                </tr>
              )
            })}
            {visibleOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Bu filtrede kayıtlı üye bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* HIZLI NOT / BAKİYE DÜZENLEME MODALI */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveOpsEdit}
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900">{editingOrder.customer_name}</h3>
                <span className="text-xs text-slate-500">
                  {editingOrder.order_number} • {editingOrder.shortPackage}
                </span>
              </div>
              <button type="button" onClick={() => setEditingOrder(null)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kalori / Diyetisyen Notu
              </label>
              <input
                type="text"
                value={editingOrder.dietitian_note || ''}
                onChange={(e) =>
                  setEditingOrder({ ...editingOrder, dietitian_note: e.target.value })
                }
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alerjen / Mutfak Kısıt Notu
              </label>
              <textarea
                rows={2}
                value={editingOrder.order_note || ''}
                onChange={(e) => setEditingOrder({ ...editingOrder, order_note: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Özel Operasyon Notu (Juice / Telafi Öğün)
              </label>
              <input
                type="text"
                value={editingOrder.special_ops_note || ''}
                onChange={(e) =>
                  setEditingOrder({ ...editingOrder, special_ops_note: e.target.value })
                }
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-red-700 mb-1">Kalan Bakiye (TL)</label>
              <input
                type="number"
                value={editingOrder.balance_due ?? 0}
                onChange={(e) =>
                  setEditingOrder({ ...editingOrder, balance_due: Number(e.target.value) })
                }
                className="w-full border border-red-300 bg-red-50/40 rounded-xl px-3.5 py-2 text-sm font-extrabold text-red-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="bg-emerald-600 text-white font-bold px-5 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {savingEdit ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}