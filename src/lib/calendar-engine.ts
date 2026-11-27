// src/lib/calendar-engine.ts
import { addDays, format, isSunday, isSaturday, parseISO, startOfDay } from 'date-fns'
import { DeliveryScheduleType } from '@/types/database'

export interface ScheduledDeliveryDay {
  delivery_date: string // YYYY-MM-DD
  package_quantity: number // Normalde 1, Cumartesi çift pakette 2
}

/**
 * Kullanıcının cihaz saat diliminden bağımsız olarak
 * Türkiye (Europe/Istanbul) tarihini (gün başlangıcı) ve saatini döner.
 */
export function getIstanbulNow(now: Date = new Date()): {
  istanbulDayStart: Date
  hour: number
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0)
  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = get('hour') % 24

  return {
    istanbulDayStart: new Date(year, month - 1, day),
    hour,
  }
}

/**
 * Türkiye (Europe/Istanbul) saatine göre müşterinin seçebileceği ilk geçerli başlangıç tarihini döner:
 * - Pazartesi - Cuma 12:00'ye kadar: Ertesi gün (+1 gün)
 * - Pazartesi - Cuma 12:00 ve sonrası: +2 gün (Cuma 12:00 sonrası Pazar'a denk gelip Pazartesi'ye kayar)
 * - Cumartesi 12:00'ye kadar: Pazartesi (+2 gün)
 * - Cumartesi 12:00 ve sonrası: Salı (+3 gün)
 * - Pazar (tüm gün): Salı (+2 gün)
 */
export function getEarliestStartDate(
  minPrepDays: number = 2,
  blockedDates: string[] = [],
  now: Date = new Date()
): Date {
  const blockedSet = new Set(blockedDates)
  const { istanbulDayStart, hour } = getIstanbulNow(now)
  const isAfterNoon = hour >= 12

  let daysToAdd = minPrepDays

  if (isSunday(istanbulDayStart)) {
    // Pazar tüm gün -> Salı (+2 gün)
    daysToAdd = minPrepDays
  } else if (isSaturday(istanbulDayStart)) {
    // Cumartesi 12:00'ye kadar -> Pazartesi (+2), 12:00 sonrası -> Salı (+3)
    daysToAdd = isAfterNoon ? minPrepDays + 1 : minPrepDays
  } else {
    // Pazartesi - Cuma: 12:00'ye kadar -> Ertesi gün (+1), 12:00 sonrası -> +2 gün
    daysToAdd = isAfterNoon ? minPrepDays : 1
  }

  let candidate = addDays(istanbulDayStart, daysToAdd)

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