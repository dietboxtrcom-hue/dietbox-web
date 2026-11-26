// src/components/PackageConfigurator.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  DietPackage,
  PackageDuration,
  City,
  District,
  Neighborhood,
  AddonProduct,
} from '@/types/database'
import { calculateDietboxPrice, formatTRY } from '@/lib/pricing-engine'
import {
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Zap,
  MapPin,
  PlusCircle,
  Check,
  Utensils,
  Clock,
  Flame,
  UserCheck,
} from 'lucide-react'

interface Props {
  pkg: DietPackage
  durations: PackageDuration[]
  cities: City[]
  districts: District[]
  neighborhoods: Neighborhood[]
  addons: AddonProduct[]
}

export default function PackageConfigurator({
  pkg,
  durations,
  cities,
  districts,
  neighborhoods,
  addons,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [menuOpen, setMenuOpen] = useState<boolean>(false)
  const [profileRegionApplied, setProfileRegionApplied] = useState<boolean>(false)

  // Paketin kendi özel periyotlarını (custom_duration_prices) baz al
  const effectiveTiers = useMemo(() => {
    const customTiers = (pkg as any).custom_duration_prices
    if (Array.isArray(customTiers) && customTiers.length > 0) {
      return customTiers.map((t: any, idx: number) => ({
        id: idx + 1,
        days: Number(t.days),
        label:
          t.label ||
          `${t.days} Günlük ; ${Math.round(Number(t.total_price) / Math.max(1, Number(t.days)))} ₺ / Günlük`,
        total_price: Number(t.total_price),
        discount_percentage: 0,
      }))
    }
    return durations.map((d, idx) => ({
      id: d.id || idx + 1,
      days: Number(d.days),
      label: d.label || `${d.days} Günlük Paket`,
      total_price: null,
      discount_percentage: Number(d.discount_percentage || 0),
    }))
  }, [pkg, durations])

  // Seçili periyot satırı indeksi
  const [selectedTierIdx, setSelectedTierIdx] = useState<number>(0)

  useEffect(() => {
    if (effectiveTiers.length === 1) {
      setSelectedTierIdx(0)
      return
    }
    const idx14 = effectiveTiers.findIndex((t) => t.days === 14)
    setSelectedTierIdx(idx14 >= 0 ? idx14 : 0)
  }, [effectiveTiers])

  const currentTier = effectiveTiers[selectedTierIdx] || effectiveTiers[0]
  const selectedDays = currentTier?.days || 14

  // Kalori seçimi (1200 / 1500 / 1800 kcal içeren paketler için)
  const [selectedCalorieOption, setSelectedCalorieOption] = useState<string>('Diyetisyen Belirlesin')
  const hasCalorieChoice = (pkg.calories_range || '').includes('1200 / 1500 / 1800')

  // Coğrafi seçimler
  const [selectedCityId, setSelectedCityId] = useState<number>(cities[0]?.id || 1)
  const [selectedSide, setSelectedSide] = useState<'Anadolu Yakası' | 'Avrupa Yakası'>('Anadolu Yakası')

  const selectedCityObj = cities.find((c) => c.id === selectedCityId) || cities[0]
  const isIstanbul = selectedCityObj?.name === 'İstanbul'

  const filteredDistricts = useMemo(
    () =>
      districts.filter(
        (d) =>
          d.city_id === selectedCityId &&
          d.is_active &&
          (isIstanbul ? d.side === selectedSide : true)
      ),
    [districts, selectedCityId, selectedSide, isIstanbul]
  )

  const [selectedDistrictId, setSelectedDistrictId] = useState<number>(
    filteredDistricts[0]?.id || districts[0]?.id || 1
  )

  const activeNeighborhoods = useMemo(
    () => neighborhoods.filter((n) => n.district_id === selectedDistrictId && n.is_active),
    [neighborhoods, selectedDistrictId]
  )

  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<number>(
    activeNeighborhoods[0]?.id || 0
  )

  // Oturum açmış üyenin profilindeki İl / Yaka / İlçe / Mahalle bilgisini otomatik seç
  useEffect(() => {
    let cancelled = false

    const applyProfileRegion = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user || cancelled) return

        const { data: prof } = await supabase
          .from('profiles')
          .select('city_id, city, district_id, district, neighborhood_id, neighborhood')
          .eq('id', user.id)
          .single()

        if (!prof || cancelled) return

        const matchedDistrict =
          districts.find((d) => d.is_active && prof.district_id && d.id === Number(prof.district_id)) ||
          districts.find(
            (d) =>
              d.is_active &&
              prof.district &&
              d.name.trim().toLowerCase() === String(prof.district).trim().toLowerCase()
          )

        if (!matchedDistrict) return

        const matchedCity =
          cities.find((c) => c.id === matchedDistrict.city_id) ||
          cities.find((c) => prof.city_id && c.id === Number(prof.city_id)) ||
          cities[0]

        const distNeighborhoods = neighborhoods.filter(
          (n) => n.district_id === matchedDistrict.id && n.is_active
        )

        const matchedNeighborhood =
          distNeighborhoods.find(
            (n) => prof.neighborhood_id && n.id === Number(prof.neighborhood_id)
          ) ||
          distNeighborhoods.find(
            (n) =>
              prof.neighborhood &&
              n.name.trim().toLowerCase() === String(prof.neighborhood).trim().toLowerCase()
          ) ||
          distNeighborhoods[0]

        if (matchedCity) setSelectedCityId(matchedCity.id)
        if (
          matchedDistrict.side === 'Anadolu Yakası' ||
          matchedDistrict.side === 'Avrupa Yakası'
        ) {
          setSelectedSide(matchedDistrict.side)
        }
        setSelectedDistrictId(matchedDistrict.id)
        if (matchedNeighborhood) {
          setSelectedNeighborhoodId(matchedNeighborhood.id)
        }
        setProfileRegionApplied(true)
      } catch {
        // Oturum veya profil yoksa varsayılan seçimle devam et
      }
    }

    applyProfileRegion()
    return () => {
      cancelled = true
    }
  }, [cities, districts, neighborhoods])

  useEffect(() => {
    if (
      activeNeighborhoods.length > 0 &&
      !activeNeighborhoods.some((n) => n.id === selectedNeighborhoodId)
    ) {
      setSelectedNeighborhoodId(activeNeighborhoods[0].id)
    }
  }, [activeNeighborhoods, selectedNeighborhoodId])

  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [quantity, setQuantity] = useState<number>(1)

  const handleCityChange = (cId: number) => {
    setProfileRegionApplied(false)
    setSelectedCityId(cId)
    const cityObj = cities.find((c) => c.id === cId)
    const nextSide = cityObj?.name === 'İstanbul' ? 'Anadolu Yakası' : 'Merkez'
    const nextDists = districts.filter(
      (d) =>
        d.city_id === cId &&
        d.is_active &&
        (cityObj?.name === 'İstanbul' ? d.side === nextSide : true)
    )
    if (nextDists[0]) {
      setSelectedDistrictId(nextDists[0].id)
      const nextNeighs = neighborhoods.filter(
        (n) => n.district_id === nextDists[0].id && n.is_active
      )
      setSelectedNeighborhoodId(nextNeighs[0]?.id || 0)
    }
  }

  const handleSideChange = (newSide: 'Anadolu Yakası' | 'Avrupa Yakası') => {
    setProfileRegionApplied(false)
    setSelectedSide(newSide)
    const nextDistricts = districts.filter(
      (d) => d.city_id === selectedCityId && d.side === newSide && d.is_active
    )
    const firstDist = nextDistricts[0]
    if (firstDist) {
      setSelectedDistrictId(firstDist.id)
      const nextNeighs = neighborhoods.filter(
        (n) => n.district_id === firstDist.id && n.is_active
      )
      setSelectedNeighborhoodId(nextNeighs[0]?.id || 0)
    }
  }

  const handleDistrictChange = (distId: number) => {
    setProfileRegionApplied(false)
    setSelectedDistrictId(distId)
    const nextNeighs = neighborhoods.filter((n) => n.district_id === distId && n.is_active)
    setSelectedNeighborhoodId(nextNeighs[0]?.id || 0)
  }

  const currentDistrict = districts.find((d) => d.id === selectedDistrictId) || null
  const currentNeighborhood =
    activeNeighborhoods.find((n) => n.id === selectedNeighborhoodId) || null
  const selectedAddonsList = addons.filter((a) => selectedAddonIds.includes(a.id))

  // Anlık Fiyat Hesaplama Motoru
  const priceBreakdown = useMemo(() => {
    return calculateDietboxPrice({
      dailyBasePrice: pkg.daily_base_price,
      durationDays: selectedDays,
      customDurationPrice: currentTier?.total_price ?? null,
      discountPercentage: currentTier?.discount_percentage || 0,
      district: currentDistrict,
      neighborhood: currentNeighborhood,
      selectedAddons: selectedAddonsList,
      quantity,
    })
  }, [
    pkg.daily_base_price,
    selectedDays,
    currentTier,
    currentDistrict,
    currentNeighborhood,
    selectedAddonsList,
    quantity,
  ])

  const toggleAddon = (id: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleProceedToCheckout = () => {
    if (!currentDistrict || !currentNeighborhood) {
      alert('Lütfen teslimat yapılan aktif bir ilçe ve mahalle seçin.')
      return
    }

    const orderDraft = {
      packageId: pkg.id,
      packageSlug: pkg.slug,
      packageTitle: `${pkg.title} (${currentTier?.label || `${selectedDays} Günlük`})${
        hasCalorieChoice ? ` - ${selectedCalorieOption}` : ''
      }`,
      dailyBasePrice: pkg.daily_base_price,
      durationDays: selectedDays,
      cityId: selectedCityId,
      cityName: selectedCityObj?.name || 'İstanbul',
      side: isIstanbul ? selectedSide : 'Merkez',
      districtId: currentDistrict.id,
      districtName: currentDistrict.name,
      neighborhoodId: currentNeighborhood.id,
      neighborhoodName: currentNeighborhood.name,
      addonIds: selectedAddonIds,
      quantity,
      priceBreakdown,
      prefillHeight: searchParams.get('height') || '',
      prefillWeight: searchParams.get('weight') || '',
    }

    sessionStorage.setItem('dietbox_checkout_draft', JSON.stringify(orderDraft))
    router.push('/odeme')
  }

  return (
    <div className="space-y-6">
      {/* 1. ÖRNEK MENÜ AÇILIR ALANI */}
      <div className="rounded-xl overflow-hidden border border-emerald-500/30 shadow-sm">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-3.5 flex items-center justify-between transition cursor-pointer"
        >
          <span className="flex items-center gap-2 text-base">
            <Utensils className="w-5 h-5" />
            Örnek Menü
          </span>
          {menuOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {menuOpen && (
          <div className="bg-white p-5 space-y-4 border-t border-emerald-100">
            {pkg.sample_menu_table && pkg.sample_menu_table.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {pkg.sample_menu_table.map((dayObj, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h4 className="font-bold text-emerald-800 border-b border-slate-200 pb-2 mb-3">
                      {dayObj.day}
                    </h4>
                    <ul className="space-y-2.5 text-sm">
                      {dayObj.meals.map((meal, mIdx) => (
                        <li key={mIdx} className="flex flex-col">
                          <div className="flex justify-between font-bold text-emerald-700">
                            <span>{meal.title}</span>
                            {meal.kcal && (
                              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                {meal.kcal}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-700 text-xs mt-0.5">{meal.desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Bu paket için örnek menü hazırlanmaktadır.</p>
            )}
          </div>
        )}
      </div>

      {/* 2. BÖLGE, İLÇE VE MAHALLE SEÇİMİ */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 border-b border-slate-100 pb-3">
          <span>
            Kategoriler:{' '}
            <span className="font-semibold text-emerald-700">
              {(pkg as any).category || 'Diyet Paketleri'}
            </span>
          </span>
          {profileRegionApplied && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              Profil mahalleniz otomatik seçildi
            </span>
          )}
        </div>

        {/* İl Seçimi */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1.5">
            İl Seçimi <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedCityId}
            onChange={(e) => handleCityChange(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-600"
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Adres / Yaka Seçimi (İstanbul ise göster) */}
        {isIstanbul && (
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              Adres Seçimi <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSide}
              onChange={(e) =>
                handleSideChange(e.target.value as 'Anadolu Yakası' | 'Avrupa Yakası')
              }
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              <option value="Anadolu Yakası">Anadolu Yakası</option>
              <option value="Avrupa Yakası">Avrupa Yakası</option>
            </select>
          </div>
        )}

        {/* İlçe ve Mahalle Yan Yana */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-red-600 mb-1.5">
              Lütfen teslimat ilçesini seçin <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedDistrictId}
              onChange={(e) => handleDistrictChange(Number(e.target.value))}
              className="w-full border border-red-400 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              {filteredDistricts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {currentDistrict?.name} Teslimat Yapılan Mahalleler
            </label>
            <select
              value={selectedNeighborhoodId}
              onChange={(e) => {
                setProfileRegionApplied(false)
                setSelectedNeighborhoodId(Number(e.target.value))
              }}
              className="w-full border border-red-400 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              {activeNeighborhoods.length > 0 ? (
                activeNeighborhoods.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))
              ) : (
                <option value={0}>Bu ilçede aktif sevkiyat mahallesi bulunmuyor</option>
              )}
            </select>
          </div>
        </div>

        {/* Mahalle Teslimat Saati Bilgisi */}
        {currentNeighborhood && (currentNeighborhood as any).delivery_time_note && (
          <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-lg font-medium">
            <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>{currentNeighborhood.name}:</strong>{' '}
              {(currentNeighborhood as any).delivery_time_note}
            </span>
          </div>
        )}

        {/* Seçilen Paket Gününe Göre Otomatik Eşleşen İlçe/Mahalle Ek Ücreti */}
        {currentDistrict && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <h4 className="text-base font-semibold text-slate-800">
              {currentDistrict.name} İçin Ek Ücret
            </h4>
            <p className="text-xs text-slate-500 font-medium">{selectedDays} Günlük</p>
            <div className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
              <span className="text-sm text-slate-600">
                {currentDistrict.name} / Bu Mahalle İçin Ek Ücret ({selectedDays} Gün) –{' '}
                {formatTRY(priceBreakdown.logisticsFeeTotal)}
              </span>
              <span className="text-sm font-bold text-slate-900">
                {formatTRY(priceBreakdown.logisticsFeeTotal)}
              </span>
            </div>
          </div>
        )}

        {/* Paket Sayısı / Varyasyon Seçimi */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-amber-500 mb-1.5">
            Paket Sayısı <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={selectedTierIdx}
              onChange={(e) => setSelectedTierIdx(Number(e.target.value))}
              disabled={effectiveTiers.length === 1}
              className="border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-600 min-w-[260px] disabled:bg-slate-100 disabled:font-bold"
            >
              {effectiveTiers.map((tier, idx) => {
                const tierTotal =
                  tier.total_price !== null && tier.total_price !== undefined
                    ? Number(tier.total_price)
                    : Math.round(
                        pkg.daily_base_price *
                          (1 - Number(tier.discount_percentage || 0) / 100)
                      ) * tier.days
                const effDaily = Math.round(tierTotal / Math.max(1, tier.days))

                return (
                  <option key={idx} value={idx}>
                    {tier.label || `${tier.days} Günlük ; ${effDaily} ₺ / Günlük`}
                  </option>
                )
              })}
            </select>
            <span className="text-base font-bold text-slate-900">
              {formatTRY(priceBreakdown.packageSubtotal)}
            </span>
          </div>
        </div>

        {/* Kalori Seçimi (Varsa) */}
        {hasCalorieChoice && (
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              Kalori Seçimi (İsteğe Bağlı)
            </label>
            <select
              value={selectedCalorieOption}
              onChange={(e) => setSelectedCalorieOption(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              <option value="Diyetisyen Belirlesin">
                Diyetisyenimiz Boy / Kilo Bilgime Göre Belirlesin
              </option>
              <option value="1200 Kcal">1200 Kalori / Gün</option>
              <option value="1500 Kcal">1500 Kalori / Gün</option>
              <option value="1800 Kcal">1800 Kalori / Gün</option>
            </select>
          </div>
        )}

        {/* 3. SEPETTE ÇAPRAZ SATIŞ */}
        {addons.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <label className="flex items-center gap-1.5 text-sm font-bold text-emerald-800">
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              Paketinize Detox İçecek veya Sağlıklı Ara Öğün Eklemek İster misiniz?
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {addons.map((addon) => {
                const isSelected = selectedAddonIds.includes(addon.id)
                return (
                  <div
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{addon.title}</p>
                        <p className="text-xs text-slate-500">{addon.description}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-700">
                      +{formatTRY(addon.price)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 4. SEÇENEK FİYATI & TOPLAM FİYAT */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-700 block">Seçenek Fiyatı</span>
            <span className="text-lg font-extrabold text-slate-900">
              {formatTRY(priceBreakdown.unitTotal)}
            </span>
          </div>

          <div className="space-y-0.5 pt-1">
            <span className="text-xs font-bold text-slate-700 block">Toplam Fiyat</span>
            <span className="text-2xl font-extrabold text-emerald-600">
              {formatTRY(priceBreakdown.grandTotal)}
            </span>
          </div>
        </div>

        {/* 5. ADET VE SEPETE EKLE / HEMEN AL */}
        <div className="pt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-3.5 py-2.5 text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
            >
              -
            </button>
            <span className="px-4 py-2.5 text-sm font-bold text-slate-900">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="px-3.5 py-2.5 text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleProceedToCheckout}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm py-3.5 px-6 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            SEPETE EKLE
          </button>

          <button
            type="button"
            onClick={handleProceedToCheckout}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-3.5 px-6 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Zap className="w-4 h-4" />
            HEMEN AL
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Teslimat başlangıç tarihinizi ve teslimat günlerinizi (Hafta İçi / Cumartesi Çift Paket) bir sonraki adımda seçebilirsiniz.
          </span>
        </div>
      </div>
    </div>
  )
}