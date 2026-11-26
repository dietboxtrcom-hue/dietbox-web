// src/components/CalorieCalculatorClient.tsx
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Flame,
  Droplets,
  Activity,
  Target,
  ArrowRight,
  CheckCircle2,
  Info,
} from 'lucide-react'
import PineappleIcon from '@/components/PineappleIcon'
import { formatTRY } from '@/lib/pricing-engine'

const ACTIVITIES = [
  {
    id: 'sedentary',
    label: 'Durağan',
    desc: 'Masa başı iş, egzersiz yok veya çok az',
    factor: 1.2,
  },
  {
    id: 'light',
    label: 'Hafif',
    desc: 'Haftada 1-3 gün hafif yürüyüş / egzersiz',
    factor: 1.375,
  },
  {
    id: 'moderate',
    label: 'Orta',
    desc: 'Haftada 3-5 gün düzenli orta seviye spor',
    factor: 1.55,
  },
  {
    id: 'active',
    label: 'Aktif',
    desc: 'Haftada 6-7 gün yoğun egzersiz',
    factor: 1.725,
  },
  {
    id: 'very_active',
    label: 'Çok Aktif',
    desc: 'Günde 2 antrenman veya fiziksel iş',
    factor: 1.85,
  },
  {
    id: 'extra_active',
    label: 'Ekstra Aktif',
    desc: 'Profesyonel sporcu / ağır antrenman temposu',
    factor: 1.95,
  },
]

const GOALS = [
  { id: 'fast_loss', label: 'Hızlı Yağ Yakımı', delta: -500, hint: 'Haftada ~0.5 kg kayıp' },
  { id: 'lose', label: 'Dengeli Kilo Verme', delta: -350, hint: 'Sürdürülebilir zayıflama' },
  { id: 'fit', label: 'Fit Görünüm (Form Koru)', delta: 0, hint: 'Mevcut kiloyu koruma' },
  { id: 'gain', label: 'Kas & Hacim Kazanımı', delta: 350, hint: 'Temiz kütle artışı' },
]

export default function CalorieCalculatorClient({ packages = [] }: { packages?: any[] }) {
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric')
  const [gender, setGender] = useState<'female' | 'male'>('female')
  const [age, setAge] = useState<string>('30')
  const [weight, setWeight] = useState<string>('68')
  const [height, setHeight] = useState<string>('168')
  const [goal, setGoal] = useState<string>('fit')
  const [activity, setActivity] = useState<string>('sedentary')

  const result = useMemo(() => {
    const a = Number(age)
    const rawW = Number(weight)
    const rawH = Number(height)

    if (!a || !rawW || !rawH || a < 12 || a > 100) {
      return null
    }

    const weightKg = unit === 'metric' ? rawW : rawW * 0.453592
    const heightCm = unit === 'metric' ? rawH : rawH * 2.54

    if (weightKg < 30 || heightCm < 100) return null

    // Mifflin-St Jeor BMR Formülü
    const bmr =
      gender === 'male'
        ? 10 * weightKg + 6.25 * heightCm - 5 * a + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * a - 161

    const actObj = ACTIVITIES.find((x) => x.id === activity) || ACTIVITIES[0]
    const goalObj = GOALS.find((x) => x.id === goal) || GOALS[2]

    const tdee = bmr * actObj.factor
    const targetCalories = Math.max(1100, Math.round(tdee + goalObj.delta))

    const heightM = heightCm / 100
    const bmi = Number((weightKg / (heightM * heightM)).toFixed(1))

    let bmiLabel = 'İdeal Kilo'
    let bmiColor = 'text-[#51a885] bg-[#51a885]/15'
    if (bmi < 18.5) {
      bmiLabel = 'Zayıf'
      bmiColor = 'text-sky-600 bg-sky-100'
    } else if (bmi >= 25 && bmi < 30) {
      bmiLabel = 'Fazla Kilolu'
      bmiColor = 'text-amber-700 bg-amber-100'
    } else if (bmi >= 30) {
      bmiLabel = 'Yüksek VKİ'
      bmiColor = 'text-rose-700 bg-rose-100'
    }

    const waterLiters = Number((weightKg * 0.035).toFixed(1))

    // Makro dağılımı (hedefe göre)
    const proteinRatio = goal === 'gain' ? 0.3 : goal === 'fast_loss' ? 0.32 : 0.25
    const fatRatio = 0.28
    const carbRatio = 1 - proteinRatio - fatRatio

    const proteinGrams = Math.round((targetCalories * proteinRatio) / 4)
    const fatGrams = Math.round((targetCalories * fatRatio) / 9)
    const carbGrams = Math.round((targetCalories * carbRatio) / 4)

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories,
      bmi,
      bmiLabel,
      bmiColor,
      waterLiters,
      proteinGrams,
      fatGrams,
      carbGrams,
    }
  }, [unit, gender, age, weight, height, goal, activity])

  // Hedefe göre DietBox paket önerisi
  const recommendedPackages = useMemo(() => {
    if (!packages || packages.length === 0) return []
    const keywords =
      goal === 'gain'
        ? ['sporcu', 'protein']
        : goal === 'fast_loss'
        ? ['detoks', 'ketojenik', 'intermittent']
        : ['zayıflama', 'dengeli', 'ofis', 'intermittent']

    const matched = packages.filter((p) => {
      const text = `${p.title} ${p.category || ''}`.toLowerCase()
      return keywords.some((k) => text.includes(k))
    })

    return (matched.length > 0 ? matched : packages).slice(0, 3)
  }, [packages, goal])

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* SOL: FORM ALANI */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          {/* Başlık + Metrik / İnç Geçişi */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Temel Bilgileriniz</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Değerleri girdikçe günlük kalori hedefiniz anlık hesaplanır.
              </p>
            </div>

            <div className="inline-flex items-center bg-slate-100 p-1 rounded-full border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  if (unit !== 'imperial') {
                    setUnit('imperial')
                    setWeight(String(Math.round(Number(weight || 68) * 2.20462)))
                    setHeight(String(Math.round(Number(height || 168) / 2.54)))
                  }
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  unit === 'imperial'
                    ? 'bg-[#0d1f18] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                İnç / lb
              </button>
              <button
                type="button"
                onClick={() => {
                  if (unit !== 'metric') {
                    setUnit('metric')
                    setWeight(String(Math.round(Number(weight || 150) * 0.453592)))
                    setHeight(String(Math.round(Number(height || 66) * 2.54)))
                  }
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  unit === 'metric'
                    ? 'bg-[#51a885] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Metrik (cm / kg)
              </button>
            </div>
          </div>

          {/* Cinsiyet & Yaş & Kilo & Boy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Cinsiyetiniz</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`py-3 rounded-2xl text-xs font-extrabold border transition cursor-pointer ${
                    gender === 'female'
                      ? 'bg-[#0d1f18] text-white border-[#0d1f18]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#51a885]'
                  }`}
                >
                  Kadın
                </button>
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`py-3 rounded-2xl text-xs font-extrabold border transition cursor-pointer ${
                    gender === 'male'
                      ? 'bg-[#0d1f18] text-white border-[#0d1f18]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#51a885]'
                  }`}
                >
                  Erkek
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Yaşınız</label>
              <input
                type="number"
                min={14}
                max={95}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Örn: 32"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#51a885] focus:outline-none rounded-2xl px-4 py-3 text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kilo ({unit === 'metric' ? 'kg' : 'lb'})
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={unit === 'metric' ? 'Örn: 68' : 'Örn: 150'}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#51a885] focus:outline-none rounded-2xl px-4 py-3 text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Boy ({unit === 'metric' ? 'cm' : 'inç'})
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder={unit === 'metric' ? 'Örn: 170' : 'Örn: 67'}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#51a885] focus:outline-none rounded-2xl px-4 py-3 text-sm font-bold"
              />
            </div>
          </div>

          {/* Hedef Seçimi */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Target className="w-4 h-4 text-[#51a885]" />
              Hedefiniz
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {GOALS.map((g) => {
                const active = goal === g.id
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoal(g.id)}
                    className={`text-left p-3.5 rounded-2xl border transition cursor-pointer ${
                      active
                        ? 'bg-[#51a885]/10 border-[#51a885] shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900">{g.label}</span>
                      {active && <CheckCircle2 className="w-4 h-4 text-[#51a885]" />}
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{g.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Aktivite Durumu */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Activity className="w-4 h-4 text-[#eab130]" />
              Aktivite Durumunuz
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ACTIVITIES.map((act) => {
                const active = activity === act.id
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setActivity(act.id)}
                    className={`text-left p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-2.5 ${
                      active
                        ? 'bg-[#0d1f18] text-white border-[#0d1f18] shadow-sm'
                        : 'bg-white border-slate-200 hover:border-[#51a885]/60 text-slate-800'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        active ? 'border-[#eab130]' : 'border-slate-300'
                      }`}
                    >
                      {active && <span className="w-2 h-2 rounded-full bg-[#eab130]" />}
                    </span>
                    <div>
                      <span className="text-xs font-extrabold block">{act.label}</span>
                      <span
                        className={`text-[11px] block mt-0.5 ${
                          active ? 'text-white/70' : 'text-slate-500'
                        }`}
                      >
                        {act.desc}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* SAĞ: CANLI SONUÇ KARTI */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
          <div className="bg-[#0d1f18] text-white rounded-3xl p-7 shadow-xl border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#eab130]">
                <Flame className="w-4 h-4" />
                Günlük Hedef Kalori Alımı
              </span>
              {result && (
                <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full ${result.bmiColor}`}>
                  VKİ: {result.bmi} • {result.bmiLabel}
                </span>
              )}
            </div>

            <div className="bg-white/8 border border-white/15 rounded-2xl p-6 text-center space-y-1">
              <div className="text-5xl font-black tracking-tight text-white">
                {result ? result.targetCalories.toLocaleString('tr-TR') : '0'}
                <span className="text-lg font-bold text-[#eab130] ml-1.5">kcal / gün</span>
              </div>
              <p className="text-xs text-white/65">
                {result
                  ? `Bazal Metabolizma (BMR): ${result.bmr} kcal • Günlük Harcama: ${result.tdee} kcal`
                  : 'Hesaplama için yaş, boy ve kilo bilgilerinizi girin.'}
              </p>
            </div>

            {/* Makro ve Su İhtiyacı */}
            {result && (
              <>
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <span className="text-[10px] uppercase font-bold text-white/60 block">Protein</span>
                    <strong className="text-lg font-black text-[#51a885]">
                      {result.proteinGrams}g
                    </strong>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <span className="text-[10px] uppercase font-bold text-white/60 block">
                      Karbonhidrat
                    </span>
                    <strong className="text-lg font-black text-[#eab130]">
                      {result.carbGrams}g
                    </strong>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <span className="text-[10px] uppercase font-bold text-white/60 block">
                      Sağlıklı Yağ
                    </span>
                    <strong className="text-lg font-black text-sky-300">{result.fatGrams}g</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[#51a885]/20 border border-[#51a885]/40 rounded-2xl px-4 py-3 text-xs">
                  <span className="flex items-center gap-2 font-semibold text-white">
                    <Droplets className="w-4 h-4 text-sky-300" />
                    Önerilen Günlük Su Tüketimi
                  </span>
                  <strong className="text-sm font-black text-[#eab130]">
                    {result.waterLiters} Litre
                  </strong>
                </div>
              </>
            )}

            <div className="pt-2 space-y-2.5">
              <Link
                href="/paketler"
                className="w-full bg-[#eab130] hover:bg-[#d49b1a] text-slate-950 font-black text-xs py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg"
              >
                <PineappleIcon className="w-4 h-4" variant="dark" />
                Kalorime Uygun Paketleri İncele
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-[11px] text-white/50 flex items-start gap-1.5 leading-relaxed">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Bu değerler Mifflin-St Jeor bilimsel formülü ile hesaplanan tahmini verilerdir. Sipariş sonrası uzman diyetisyenimiz size özel kesin kalori planını oluşturur.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* HEDEFE GÖRE ÖNERİLEN DIETBOX PAKETLERİ */}
      {recommendedPackages.length > 0 && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#51a885]">
                Hedefinize Özel Öneriler
              </span>
              <h3 className="text-2xl font-black text-slate-900">
                Bu Kalori Hedefine En Uygun DietBox Paketleri
              </h3>
            </div>
            <Link
              href="/paketler"
              className="text-xs font-extrabold text-[#51a885] hover:underline flex items-center gap-1"
            >
              Tüm Paketleri Gör <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendedPackages.map((pkg) => (
              <Link
                key={pkg.id}
                href={`/paketler/${pkg.slug}`}
                className="group bg-white rounded-3xl overflow-hidden border border-slate-200/80 hover:border-[#51a885] shadow-xs hover:shadow-lg transition flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 overflow-hidden bg-slate-100 relative">
                    <img
                      src={
                        pkg.cover_image ||
                        'https://www.dietboxtr.com/wp-content/uploads/2020/07/dietbox-19.jpg'
                      }
                      alt={pkg.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <span className="absolute top-3 left-3 bg-[#0d1f18]/85 text-[#eab130] text-[10px] font-extrabold px-2.5 py-1 rounded-full">
                      {pkg.calories_range || 'Kişiye Özel Kalori'}
                    </span>
                  </div>
                  <div className="p-5 space-y-2">
                    <h4 className="font-extrabold text-slate-900 text-base group-hover:text-[#51a885] transition">
                      {pkg.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{pkg.short_description}</p>
                  </div>
                </div>
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-black text-[#0d1f18] text-sm">
                    {formatTRY(pkg.daily_base_price)}
                    <span className="text-[11px] font-medium text-slate-400"> / gün</span>
                  </span>
                  <span className="font-extrabold text-[#51a885] flex items-center gap-1">
                    Paketi İncele <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}