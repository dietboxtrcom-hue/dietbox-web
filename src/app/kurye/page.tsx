// src/app/kurye/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Phone, MessageCircle, CheckCircle2, Truck } from 'lucide-react'

export default function CourierMobilePage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  )
  const [deliveries, setDeliveries] = useState<any[]>([])

  const loadCourierDeliveries = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('order_deliveries')
      .select('*, orders(*)')
      .eq('delivery_date', selectedDate)
      .neq('status', 'frozen')
      .neq('status', 'holiday_shifted')

    setDeliveries(data || [])
  }

  useEffect(() => {
    loadCourierDeliveries()
  }, [selectedDate])

  const markDelivered = async (deliveryId: string) => {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_delivery_status',
        payload: { deliveryId, status: 'delivered' },
      }),
    })
    loadCourierDeliveries()
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Truck className="w-6 h-6 text-emerald-400" />
          <div>
            <h1 className="font-extrabold text-base">DIETBOX KURYE SAHA EKRANI</h1>
            <p className="text-[11px] text-slate-400">Günlük Teslimat & Rota Listesi</p>
          </div>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
        />
      </div>

      {deliveries.length === 0 ? (
        <div className="bg-slate-800/60 rounded-2xl p-8 text-center text-sm text-slate-400">
          Seçili tarihte ({selectedDate}) dağıtılacak paket bulunmuyor.
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((item, idx) => {
            const o = item.orders
            const fullMapQuery = encodeURIComponent(
              `${o?.full_address || ''} ${o?.neighborhood_name || ''} ${o?.district_name || ''} İstanbul`
            )
            const cleanPhone = o?.customer_phone?.replace(/\D/g, '').replace(/^0/, '') || ''

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border space-y-3 ${
                  item.status === 'delivered'
                    ? 'bg-emerald-950/40 border-emerald-700/50 opacity-75'
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-400 uppercase">
                      #{idx + 1} • {o?.district_name} / {o?.neighborhood_name}
                    </span>
                    <h2 className="font-bold text-base">{o?.customer_name}</h2>
                    <p className="text-xs text-slate-300">{o?.package_title}</p>
                  </div>

                  {item.package_quantity > 1 ? (
                    <span className="bg-amber-500 text-slate-950 text-xs font-extrabold px-2.5 py-1 rounded-lg">
                      {item.package_quantity} PAKET!
                    </span>
                  ) : (
                    <span className="bg-slate-700 text-slate-200 text-xs font-bold px-2.5 py-1 rounded-lg">
                      1 Paket
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl">
                  {o?.full_address}
                </p>

                {o?.order_note && (
                  <p className="text-xs text-amber-300 font-medium">
                    Not: {o.order_note}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${fullMapQuery}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Harita
                  </a>

                  <a
                    href={`https://wa.me/90${cleanPhone}?text=${encodeURIComponent(
                      `Merhaba ${o?.customer_name}, DietBox günlük taze yemek paketiniz kapınıza teslim edilmiştir. Afiyet olsun!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>

                  {item.status === 'delivered' ? (
                    <div className="bg-emerald-800/50 text-emerald-300 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Teslim Edildi
                    </div>
                  ) : (
                    <button
                      onClick={() => markDelivered(item.id)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Teslim Et
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}