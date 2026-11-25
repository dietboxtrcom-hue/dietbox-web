// src/lib/pricing-engine.ts
export interface PriceCalculationInput {
  dailyBasePrice: number
  durationDays: number
  customDurationPrice?: number | null // Paketin o gün sayısı için özel belirlenen toplam fiyatı
  discountPercentage?: number
  district?: any | null
  neighborhood?: any | null
  selectedAddons?: any[]
  quantity?: number
}

export interface PriceBreakdown {
  effectiveDailyPackagePrice: number
  packageSubtotal: number
  dailyLogisticsFee: number
  logisticsFeeTotal: number
  addonsTotal: number
  unitTotal: number
  grandTotal: number
}

export function calculateDietboxPrice(input: PriceCalculationInput): PriceBreakdown {
  const {
    dailyBasePrice,
    durationDays,
    customDurationPrice = null,
    discountPercentage = 0,
    district,
    neighborhood,
    selectedAddons = [],
    quantity = 1,
  } = input

  // 1. Paket Ara Toplamı:
  // Eğer bu gün periyodu için özel (orantısız) bir paket fiyatı girilmişse doğrudan onu kullan!
  let packageSubtotal = 0
  let effectiveDailyPackagePrice = Number(dailyBasePrice)

  if (customDurationPrice !== null && customDurationPrice !== undefined && Number(customDurationPrice) > 0) {
    packageSubtotal = Number(customDurationPrice)
    effectiveDailyPackagePrice = Math.round(packageSubtotal / Math.max(1, durationDays))
  } else {
    const discountFactor = 1 - Number(discountPercentage) / 100
    effectiveDailyPackagePrice = Math.round(Number(dailyBasePrice) * discountFactor)
    packageSubtotal = effectiveDailyPackagePrice * durationDays
  }

  // 2. Mahalle / İlçe Lojistik Ek Ücreti:
  // Mahallenin period_fees JSON'unda seçilen gün (örn "14": 980) varsa onu alır, yoksa günlük ücreti çarpar
  let logisticsFeeTotal = 0
  let dailyLogisticsFee = 0

  const periodKey = String(durationDays)
  if (
    neighborhood?.period_fees &&
    neighborhood.period_fees[periodKey] !== undefined &&
    neighborhood.period_fees[periodKey] !== null &&
    neighborhood.period_fees[periodKey] !== ''
  ) {
    logisticsFeeTotal = Number(neighborhood.period_fees[periodKey])
    dailyLogisticsFee = Math.round(logisticsFeeTotal / Math.max(1, durationDays))
  } else {
    if (neighborhood && neighborhood.custom_daily_fee !== null && neighborhood.custom_daily_fee !== undefined) {
      dailyLogisticsFee = Number(neighborhood.custom_daily_fee)
    } else if (district && district.default_daily_fee) {
      dailyLogisticsFee = Number(district.default_daily_fee)
    }
    logisticsFeeTotal = dailyLogisticsFee * durationDays
  }

  // 3. Çapraz Satış (Addon) Toplamı
  const addonsTotal = selectedAddons.reduce((sum, item) => sum + Number(item.price), 0)

  // 4. Genel Toplam
  const unitTotal = packageSubtotal + logisticsFeeTotal + addonsTotal
  const grandTotal = unitTotal * quantity

  return {
    effectiveDailyPackagePrice,
    packageSubtotal,
    dailyLogisticsFee,
    logisticsFeeTotal,
    addonsTotal,
    unitTotal,
    grandTotal,
  }
}

export function formatTRY(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(amount || 0)
}