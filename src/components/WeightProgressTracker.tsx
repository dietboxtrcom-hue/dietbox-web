// src/components/WeightProgressTracker.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingDown, TrendingUp, Scale, Plus, Trash2, Target, Calendar } from 'lucide-react'
import PineappleIcon from '@/components/PineappleIcon'

interface WeightLog {
  id: number
  user_id: string
  weight_kg: number
  measured_at: string
  note?: string | null
}

interface Props {
  userId: string
  currentWeight?: number | null
  targetWeight?: number | null
  onWeightUpdated?: (newWeight: number) => void
}

export default function WeightProgressTracker({
  userId,
  currentWeight,
  targetWeight,
  onWeightUpdated,
}: Props) {
  const [logs, setLogs] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [weightInput, setWeightInput] = useState(currentWeight ? String(currentWeight) : '')
  const [dateInput, setDateInput] = useState(() => new Date().toISOString().slice(0, 10))
  const [noteInput, setNoteInput] = useState('')
  const [goalWeight, setGoalWeight] = useState(targetWeight ? String(targetWeight) : '')

  const fetchLogs = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('measured_at', { ascending: true })
      .order('id', { ascending: true })

    setLogs((data as WeightLog[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    if (userId) fetchLogs()
  }, [userId])

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault()
    const w = Number(weightInput.replace(',', '.'))
    if (!w || w < 30 || w > 250) {
      alert('Lütfen geçerli bir kilo değeri girin (ör. 78.5).')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase.from('weight_logs').insert({
      user_id: userId,
      weight_kg: w,
      measured_at: dateInput || new Date().toISOString().slice(0, 10),
      note: noteInput.trim() || null,
    })

    if (error) {
      alert('Kayıt eklenemedi: ' + error.message)
      setSaving(false)
      return
    }

    // Profildeki güncel kiloyu ve varsa hedef kiloyu da senkronize et
    const updatePayload: any = { weight_kg: w }
    const g = Number(goalWeight.replace(',', '.'))
    if (g >= 35 && g <= 200) updatePayload.target_weight_kg = g

    await supabase.from('profiles').update(updatePayload).eq('id', userId)
    if (onWeightUpdated) onWeightUpdated(w)

    setNoteInput('')
    await fetchLogs()
    setSaving(false)
  }

  const handleDeleteLog = async (id: number) => {
    if (!confirm('Bu tartı kaydını silmek istediğinize emin misiniz?')) return
    const supabase = createClient()
    await supabase.from('weight_logs').delete().eq('id', id)
    fetchLogs()
  }

  const stats = useMemo(() => {
    if (logs.length === 0) return null
    const first = Number(logs[0].weight_kg)
    const latest = Number(logs[logs.length - 1].weight_kg)
    const diff = Number((latest - first).toFixed(1))
    const goalNum = Number(goalWeight) || Number(targetWeight) || null
    const toGoal = goalNum ? Number((latest - goalNum).toFixed(1)) : null
    return { first, latest, diff, goalNum, toGoal }
  }, [logs, goalWeight, targetWeight])

  // Saf SVG Grafik Koordinatları
  const chartData = useMemo(() => {
    if (logs.length < 2) return null
    const width = 640
    const height = 220
    const padX = 40
    const padY = 28

    const weights = logs.map((l) => Number(l.weight_kg))
    const minW = Math.min(...weights) - 1
    const maxW = Math.max(...weights) + 1
    const range = Math.max(maxW - minW, 1)

    const points = logs.map((l, idx) => {
      const x = padX + (idx / (logs.length - 1)) * (width - padX * 2)
      const y = height - padY - ((Number(l.weight_kg) - minW) / range) * (height - padY * 2)
      return { x, y, ...l }
    })

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ')

    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${
      height - padY
    } L ${points[0].x.toFixed(1)} ${height - padY} Z`

    return { width, height, padY, points, linePath, areaPath }
  }, [logs])

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#51a885]">
            <PineappleIcon className="w-3.5 h-3.5" />
            Kişisel Gelişim Takibi
          </span>
          <h3 className="text-xl font-black text-slate-900 mt-0.5">
            Kilo &amp; Form Grafiğim
          </h3>
        </div>
        {stats && stats.diff < 0 && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-[#51a885]" />
            Harika gidiyorsunuz! Toplam {Math.abs(stats.diff)} kg verdiniz
          </div>
        )}
      </div>

      {/* Özet Kartları */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-slate-400 block">Başlangıç</span>
            <strong className="text-xl font-black text-slate-900">{stats.first} kg</strong>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-slate-400 block">Güncel Kilo</span>
            <strong className="text-xl font-black text-[#0d1f18]">{stats.latest} kg</strong>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-emerald-700 block">Toplam Değişim</span>
            <strong className="text-xl font-black text-emerald-800 flex items-center gap-1">
              {stats.diff > 0 ? `+${stats.diff}` : stats.diff} kg
              {stats.diff <= 0 ? (
                <TrendingDown className="w-4 h-4 text-[#51a885]" />
              ) : (
                <TrendingUp className="w-4 h-4 text-amber-600" />
              )}
            </strong>
          </div>
          <div className="bg-[#0d1f18] text-white rounded-2xl p-4">
            <span className="text-[11px] font-bold text-[#eab130] flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> Hedef Kilo
            </span>
            <strong className="text-xl font-black block">
              {stats.goalNum ? `${stats.goalNum} kg` : 'Belirlenmedi'}
            </strong>
            {stats.toGoal !== null && (
              <span className="text-[10px] text-white/70">
                {stats.toGoal > 0 ? `Hedefe ${stats.toGoal} kg kaldı` : 'Hedefe ulaştınız!'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Yeni Tartı Ekleme Formu */}
      <form
        onSubmit={handleAddLog}
        className="bg-[#f8faf9] border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
      >
        <div className="sm:col-span-3">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Güncel Kilo (kg)
          </label>
          <div className="relative">
            <Scale className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="number"
              step="0.1"
              required
              placeholder="Örn: 78.4"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-bold"
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Hedef (kg)</label>
          <input
            type="number"
            step="0.1"
            placeholder="Örn: 72"
            value={goalWeight}
            onChange={(e) => setGoalWeight(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
          />
        </div>

        <div className="sm:col-span-3">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Tarih</label>
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="date"
              required
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-2 py-2 text-xs font-semibold"
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Kısa Not</label>
          <input
            type="text"
            placeholder="1. hafta sonu"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="sm:col-span-2 bg-[#51a885] hover:bg-[#3f8d6d] text-white font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
        >
          <Plus className="w-4 h-4" />
          {saving ? 'Kaydediliyor...' : 'Ekle'}
        </button>
      </form>

      {/* Çizgi Grafik Alanı */}
      {chartData ? (
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartData.width} ${chartData.height}`}
            className="w-full min-w-[460px] h-auto"
          >
            <defs>
              <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#51a885" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#51a885" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            <path d={chartData.areaPath} fill="url(#weightAreaGrad)" />
            <path
              d={chartData.linePath}
              fill="none"
              stroke="#51a885"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {chartData.points.map((p) => (
              <g key={p.id}>
                <circle cx={p.x} cy={p.y} r="5.5" fill="#0d1f18" stroke="#eab130" strokeWidth="2.5" />
                <text
                  x={p.x}
                  y={p.y - 11}
                  textAnchor="middle"
                  className="fill-slate-900 text-[11px] font-extrabold"
                >
                  {p.weight_kg} kg
                </text>
                <text
                  x={p.x}
                  y={chartData.height - 6}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] font-semibold"
                >
                  {p.measured_at.slice(5).split('-').reverse().join('.')}
                </text>
              </g>
            ))}
          </svg>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-xs text-slate-500">
          {loading
            ? 'Gelişim verileri yükleniyor...'
            : 'Grafiğinizin oluşması için en az 2 farklı tarihte kilo kaydı girin.'}
        </div>
      )}

      {/* Tartı Geçmişi Listesi */}
      {logs.length > 0 && (
        <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden text-xs">
          {[...logs].reverse().map((log) => (
            <div
              key={log.id}
              className="px-4 py-3 flex items-center justify-between gap-3 bg-white hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-bold">
                  {log.measured_at.split('-').reverse().join('.')}
                </span>
                <strong className="text-sm font-black text-slate-900">{log.weight_kg} kg</strong>
                {log.note && <span className="text-slate-500">— {log.note}</span>}
              </div>
              <button
                type="button"
                onClick={() => handleDeleteLog(log.id)}
                className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                title="Kaydı Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}