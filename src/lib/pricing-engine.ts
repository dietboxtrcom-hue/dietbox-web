// src/lib/pricing-engine.ts
export interface PriceCalculationInput {
  dailyBasePrice: number
  durationDays: number
  customDurationPrice?: number | null // Paketin o gün sayısı için özel belirlenen toplam fiyatı
  discountPercentage?: number
  dailyCustomizationDelta?: number // Laktozsuz (+100), Süt Ürünsüz (+130), Öğün Çıkarma (-100 / -35 / -70)
  district?: any | null
  neighborhood?: any | null
  selectedAddons?: any[]
  quantity?: number
}

export interface PriceBreakdown {
  effectiveDailyPackagePrice: number
  packageSubtotal: number
  dailyCustomizationDelta: number
  customizationTotal: number
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
    dailyCustomizationDelta = 0,
    district,
    neighborhood,
    selectedAddons = [],
    quantity = 1,
  } = input

  // 1. Paket Ara Toplamı
  let packageSubtotal = 0
  let effectiveDailyPackagePrice = Number(dailyBasePrice)

  if (
    customDurationPrice !== null &&
    customDurationPrice !== undefined &&
    Number(customDurationPrice) > 0
  ) {
    packageSubtotal = Number(customDurationPrice)
    effectiveDailyPackagePrice = Math.round(packageSubtotal / Math.max(1, durationDays))
  } else {
    const discountFactor = 1 - Number(discountPercentage) / 100
    effectiveDailyPackagePrice = Math.round(Number(dailyBasePrice) * discountFactor)
    packageSubtotal = effectiveDailyPackagePrice * durationDays
  }

  // 2. Paket Özelleştirme Farkı (Laktozsuz / Süt Ürünsüz / Öğün Çıkarma)
  const safeDailyDelta = Number(dailyCustomizationDelta) || 0
  const rawCustomizationTotal = safeDailyDelta * durationDays
  const customizationTotal = Math.max(-packageSubtotal, rawCustomizationTotal)

  // 3. Mahalle / İlçe Lojistik Ek Ücreti
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
    if (
      neighborhood &&
      neighborhood.custom_daily_fee !== null &&
      neighborhood.custom_daily_fee !== undefined
    ) {
      dailyLogisticsFee = Number(neighborhood.custom_daily_fee)
    } else if (district && district.default_daily_fee) {
      dailyLogisticsFee = Number(district.default_daily_fee)
    }
    logisticsFeeTotal = dailyLogisticsFee * durationDays
  }

  // 4. Çapraz Satış (Addon) Toplamı
  const addonsTotal = selectedAddons.reduce((sum, item) => sum + Number(item.price), 0)

  // 5. Genel Toplam
  const unitTotal = Math.max(0, packageSubtotal + customizationTotal) + logisticsFeeTotal + addonsTotal
  const grandTotal = unitTotal * quantity

  return {
    effectiveDailyPackagePrice,
    packageSubtotal,
    dailyCustomizationDelta: safeDailyDelta,
    customizationTotal,
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