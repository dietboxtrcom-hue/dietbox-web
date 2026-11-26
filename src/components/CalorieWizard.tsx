// src/components/CalorieWizard.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DietPackage } from '@/types/database'
import { formatTRY } from '@/lib/pricing-engine'
import { Calculator, ArrowRight, CheckCircle2 } from 'lucide-react'
import PineappleIcon from '@/components/PineappleIcon'

interface Props {
  packages: DietPackage[]
}

export default function CalorieWizard({ packages }: Props) {
  const [gender, setGender] = useState<'female' | 'male'>('male')
  const [age, setAge] = useState<number>(32)
  const [height, setHeight] = useState<number>(168)
  const [weight, setWeight] = useState<number>(72)
  const [goal, setGoal] = useState<'lose' | 'fasting' | 'muscle'>('lose')
  const [result, setResult] = useState<{
    bmi: number
    bmiStatus: string
    targetCalories: number
    recommendedPkg: DietPackage | null
  } | null>(null)

  const calculateNow = () => {
    const h = Number(height) || 170
    const w = Number(weight) || 70
    const a = Number(age) || 30

    // 1. VKİ (BMI) Hesabı
    const heightInMeters = h / 100
    const bmi = Number((w / (heightInMeters * heightInMeters)).toFixed(1))

    let bmiStatus = 'İdeal Kilo'
    if (bmi < 18.5) bmiStatus = 'Düşük Kilolu'
    else if (bmi >= 25 && bmi < 30) bmiStatus = 'Fazla Kilolu'
    else if (bmi >= 30) bmiStatus = 'Obezite Sınırı'

    // 2. Mifflin-St Jeor Bazal Metabolizma & Hedef Kalori Hesabı
    const bmr =
      gender === 'male'
        ? 10 * w + 6.25 * h - 5 * a + 5
        : 10 * w + 6.25 * h - 5 * a - 161

    const tdee = bmr * 1.35
    let targetCalories = Math.round(tdee)

    if (goal === 'lose') targetCalories = Math.max(1150, Math.round(tdee - 450))
    if (goal === 'fasting') targetCalories = Math.max(1100, Math.round(tdee - 500))
    if (goal === 'muscle') targetCalories = Math.round(tdee + 250)

    // 3. En Uygun DietBox Paketini Eşleştir
    let matched = packages.find((p) => {
      if (goal === 'fasting' && p.slug.includes('fasting')) return true
      if (goal === 'muscle' && p.slug.includes('sporcu')) return true
      if (goal === 'lose' && p.slug.includes('zayiflama')) return true
      return (
        p.min_calorie_target !== null &&
        p.max_calorie_target !== null &&
        targetCalories >= p.min_calorie_target &&
        targetCalories <= p.max_calorie_target
      )
    })

    if (!matched && packages.length > 0) {
      matched = packages[0]
    }

    setResult({
      bmi,
      bmiStatus,
      targetCalories,
      recommendedPkg: matched || null,
    })
  }

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault()
    calculateNow()
  }

  return (
    <section
      id="kalori-sihirbazi"
      className="py-16 bg-emerald-950 text-white rounded-3xl my-12 px-6 md:px-12 shadow-2xl"
    >
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 bg-emerald-800/60 border border-emerald-600/40 px-4 py-1.5 rounded-full text-emerald-200 text-sm font-medium">
            <PineappleIcon className="w-4 h-4" />
            Akıllı Paket Öneri Sihirbazı
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Size En Uygun Diyet Paketini 10 Saniyede Bulalım
          </h2>
          <p className="text-emerald-200/80 text-base leading-relaxed">
            Boy, kilo ve beslenme hedefinizi girin; algoritmamız günlük kalori ihtiyacınızı hesaplayarak size en uygun taze yemek paketini önersin.
          </p>

          <form onSubmit={handleCalculate} className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="col-span-2 sm:col-span-2">
              <label className="block text-xs text-emerald-300 mb-1">Cinsiyet</label>
              <div className="grid grid-cols-2 gap-2 bg-emerald-900/60 p-1 rounded-xl border border-emerald-800">
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                    gender === 'female'
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-emerald-200'
                  }`}
                >
                  Kadın
                </button>
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                    gender === 'male'
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-emerald-200'
                  }`}
                >
                  Erkek
                </button>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-2">
              <label className="block text-xs text-emerald-300 mb-1">Hedefiniz</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as 'lose' | 'fasting' | 'muscle')}
                className="w-full bg-emerald-900/60 border border-emerald-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
              >
                <option value="lose">Sağlıklı Kilo Verme (Dengeli)</option>
                <option value="fasting">Aralıklı Oruç (IF 16:8 Hızlı Yağ Yakımı)</option>
                <option value="muscle">Kas Kütlesi & Sporcu Beslenmesi</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-emerald-300 mb-1">Boyunuz (Cm)</label>
              <input
                type="number"
                min={130}
                max={220}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full bg-emerald-900/60 border border-emerald-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-emerald-300 mb-1">Kilonuz (Kg)</label>
              <input
                type="number"
                min={35}
                max={200}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full bg-emerald-900/60 border border-emerald-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-emerald-300 mb-1">Yaşınız</label>
              <input
                type="number"
                min={15}
                max={90}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full bg-emerald-900/60 border border-emerald-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                required
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={calculateNow}
                className="w-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Calculator className="w-4 h-4" />
                Hesapla
              </button>
            </div>
          </form>
        </div>

        {/* Sonuç Kartı */}
        <div className="lg:col-span-5">
          {result ? (
            <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-xl border border-emerald-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    VKİ Skorunuz ({result.bmiStatus})
                  </span>
                  <p className="text-2xl font-extrabold text-slate-800">{result.bmi}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    Önerilen Günlük Hedef
                  </span>
                  <p className="text-2xl font-extrabold text-emerald-600">
                    ~{result.targetCalories} kcal
                  </p>
                </div>
              </div>

              {result.recommendedPkg ? (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    SİZİN İÇİN ÖNERİLEN PAKET
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {result.recommendedPkg.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {result.recommendedPkg.short_description}
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-semibold text-slate-500">
                      Günlük:{' '}
                      <strong className="text-slate-900">
                        {formatTRY(result.recommendedPkg.daily_base_price)}
                      </strong>
                    </span>
                    <Link
                      href={`/paketler/${result.recommendedPkg.slug}?height=${height}&weight=${weight}`}
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
                    >
                      Paketi Seç & İlerle
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  Hedef kaloriniz hesaplandı! Paket önerisi için Supabase SQL sorgusunun çalıştırıldığından ve <code>.env.local</code> anahtarlarının doğruluğundan emin olun.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-emerald-900/40 border border-emerald-800/80 rounded-2xl p-8 text-center space-y-3">
              <Calculator className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
              <p className="text-emerald-100 font-medium">
                Bilgilerinizi girip <strong>Hesapla</strong> butonuna tıkladığınızda size özel paket önerimiz burada görünecektir.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}