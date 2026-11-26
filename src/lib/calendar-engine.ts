// src/lib/calendar-engine.ts
import { addDays, format, isSunday, isSaturday, parseISO, startOfDay } from 'date-fns'
import { DeliveryScheduleType } from '@/types/database'

export interface ScheduledDeliveryDay {
  delivery_date: string // YYYY-MM-DD
  package_quantity: number // Normalde 1, Cumartesi çift pakette 2
}

/**
 * Sipariş anından itibaren ilk X hazırlık gününü (varsayılan 2 gün) kapatarak
 * müşterinin seçebileceği ilk geçerli başlangıç tarihini döner.
 * - Hafta içi (Pzt-Per): +2 gün
 * - Cuma: +2 gün Pazar'a denk geldiği için Pazartesi
 * - Cumartesi 12:00'ye kadar: Pazartesi (+2 gün)
 * - Cumartesi 12:00 ve sonrası: Salı (+3 gün)
 * - Pazar: Salı (+2 gün)
 */
export function getEarliestStartDate(
  minPrepDays: number = 2,
  blockedDates: string[] = [],
  now: Date = new Date()
): Date {
  const blockedSet = new Set(blockedDates)
  const isSatAfterNoon = isSaturday(now) && now.getHours() >= 12
  const daysToAdd = isSatAfterNoon ? minPrepDays + 1 : minPrepDays

  let candidate = addDays(startOfDay(now), daysToAdd)

  // İlk uygun gün Pazar ise veya kapalı/tatil günüyse bir sonraki güne kaydır
  while (isSunday(candidate) || blockedSet.has(format(candidate, 'yyyy-MM-dd'))) {
    candidate = addDays(candidate, 1)
  }

  return candidate
}

/**
 * Belirli bir tarihin takvimde başlangıç günü olarak seçilebilir olup olmadığını kontrol eder.
 */
export function isDateSelectableForStart(
  date: Date,
  minPrepDays: number = 2,
  blockedDates: string[] = [],
  now: Date = new Date()
): boolean {
  const earliest = getEarliestStartDate(minPrepDays, blockedDates, now)
  const target = startOfDay(date)

  if (target < earliest) return false
  if (isSunday(target)) return false // Pazar günü kurye dağıtımı yok (C.tesi çift paket gidiyor)
  if (blockedDates.includes(format(target, 'yyyy-MM-dd'))) return false

  return true
}

/**
 * Seçilen Başlangıç Tarihi, Paket Gün Sayısı (5, 10, 14, 21, 30) ve Teslimat Kuralına göre
 * tüm teslimat takvimini ve kesin Paket Bitiş Tarihini hesaplar.
 */
export function generateDeliverySchedule(
  startDateStr: string, // YYYY-MM-DD
  totalPackageDays: number,
  scheduleType: DeliveryScheduleType,
  holidayDates: string[] = [] // YYYY-MM-DD formatında resmi tatiller
): {
  deliveries: ScheduledDeliveryDay[]
  estimatedEndDate: string
} {
  const holidaySet = new Set(holidayDates)
  const deliveries: ScheduledDeliveryDay[] = []

  let remainingPackages = totalPackageDays
  let currentDate = parseISO(startDateStr)
  let safetyCounter = 0

  while (remainingPackages > 0 && safetyCounter < 365) {
    safetyCounter++
    const dateStr = format(currentDate, 'yyyy-MM-dd')

    // 1. Resmi tatil / kapalı gün kontrolü (Hakkı yanmaz, sonraki güne kayar)
    if (holidaySet.has(dateStr)) {
      currentDate = addDays(currentDate, 1)
      continue
    }

    // 2. Pazar günü kontrolü (Hiçbir seçenekte Pazar günü fiziksel kurye çıkmaz)
    if (isSunday(currentDate)) {
      currentDate = addDays(currentDate, 1)
      continue
    }

    // 3. Cumartesi günü kontrolü
    if (isSaturday(currentDate)) {
      if (scheduleType === 'weekdays_only') {
        // Sadece Hafta İçi seçildiyse Cumartesi atlanır
        currentDate = addDays(currentDate, 1)
        continue
      }

      if (scheduleType === 'every_day_sat_double') {
        // Her Gün (Cumartesi 2 paket - Cumartesi ve Pazar) seçildiyse:
        // Kalan paket hakkı en az 2 ise Cumartesi 2 paket teslim edilir, 1 ise 1 paket teslim edilir.
        const qty = remainingPackages >= 2 ? 2 : 1
        deliveries.push({
          delivery_date: dateStr,
          package_quantity: qty,
        })
        remainingPackages -= qty
        currentDate = addDays(currentDate, 1)
        continue
      }
    }

    // 4. Normal Hafta İçi (veya Pazar Hariç seçeneğindeki Cumartesi) -> 1 Paket
    deliveries.push({
      delivery_date: dateStr,
      package_quantity: 1,
    })
    remainingPackages -= 1
    currentDate = addDays(currentDate, 1)
  }

  const estimatedEndDate =
    deliveries.length > 0
      ? deliveries[deliveries.length - 1].delivery_date
      : startDateStr

  return {
    deliveries,
    estimatedEndDate,
  }
}