// src/lib/calendar-engine.ts
import {
  addDays,
  format,
  getDay,
  isSunday,
  isSaturday,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns'
import { tr } from 'date-fns/locale'
import { DeliveryScheduleType } from '@/types/database'

export interface ScheduledDeliveryDay {
  delivery_date: string // YYYY-MM-DD
  package_quantity: number // Normalde 1, Cumartesi çift pakette 2
}

/**
 * Kullanıcının cihaz saat diliminden bağımsız olarak
 * Türkiye (Europe/Istanbul) tarihini ve saat/dakika/saniye bilgisini döner.
 */
export function getIstanbulNow(now: Date = new Date()): {
  istanbulDayStart: Date
  hour: number
  minute: number
  second: number
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0)
  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = get('hour') % 24
  const minute = get('minute')
  const second = get('second')

  return {
    istanbulDayStart: new Date(year, month - 1, day),
    hour,
    minute,
    second,
  }
}

/**
 * Türkiye (Europe/Istanbul) saatine göre müşterinin seçebileceği ilk geçerli başlangıç tarihini döner.
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
    daysToAdd = minPrepDays
  } else if (isSaturday(istanbulDayStart)) {
    daysToAdd = isAfterNoon ? minPrepDays + 1 : minPrepDays
  } else {
    daysToAdd = isAfterNoon ? minPrepDays : 1
  }

  let candidate = addDays(istanbulDayStart, daysToAdd)

  while (isSunday(candidate) || blockedSet.has(format(candidate, 'yyyy-MM-dd'))) {
    candidate = addDays(candidate, 1)
  }

  return candidate
}

/**
 * Ödeme sayfasındaki canlı geri sayım banner'ı için gerçek zamanlı bilgi üretir.
 */
export function getDeliveryCountdownInfo(
  minPrepDays: number = 2,
  blockedDates: string[] = [],
  now: Date = new Date()
): {
  isBeforeCutoff: boolean
  isSundayToday: boolean
  remainingFormatted: string
  earliestDateLabel: string
  isTomorrow: boolean
  nextDayLabel: string
} {
  const { istanbulDayStart, hour, minute, second } = getIstanbulNow(now)
  const isSundayToday = isSunday(istanbulDayStart)
  const isBeforeCutoff = !isSundayToday && hour < 12

  const earliest = getEarliestStartDate(minPrepDays, blockedDates, now)
  const tomorrow = addDays(istanbulDayStart, 1)
  const isTomorrow = format(earliest, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')

  const earliestDateLabel = format(earliest, 'd MMMM EEEE', { locale: tr })

  const totalSecondsLeft = Math.max(0, 12 * 3600 - (hour * 3600 + minute * 60 + second))
  const h = Math.floor(totalSecondsLeft / 3600)
  const m = Math.floor((totalSecondsLeft % 3600) / 60)
  const s = totalSecondsLeft % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const remainingFormatted = `${pad(h)} sa ${pad(m)} dk ${pad(s)} sn`

  const nextEarliest = getEarliestStartDate(
    minPrepDays,
    blockedDates,
    new Date(
      istanbulDayStart.getFullYear(),
      istanbulDayStart.getMonth(),
      istanbulDayStart.getDate(),
      13,
      0,
      0
    )
  )
  const nextDayLabel = format(nextEarliest, 'd MMMM EEEE', { locale: tr })

  return {
    isBeforeCutoff,
    isSundayToday,
    remainingFormatted,
    earliestDateLabel,
    isTomorrow,
    nextDayLabel,
  }
}

/**
 * Paket Dondurma Zaman Kuralı:
 * Teslimat gününden 1 gün önce saat 12:00'ye (İstanbul saati) kadar dondurulabilir.
 */
export function getFreezeEligibility(
  deliveryDateStr: string,
  now: Date = new Date()
): {
  canFreeze: boolean
  reason: string
  deadlineText: string
} {
  const { istanbulDayStart, hour } = getIstanbulNow(now)
  const targetDay = startOfDay(parseISO(deliveryDateStr))
  const deadlineDay = subDays(targetDay, 1)
  const deadlineText = `${format(deadlineDay, 'dd.MM.yyyy')} saat 12:00`

  if (targetDay <= istanbulDayStart) {
    return {
      canFreeze: false,
      reason: 'Bu teslimat günü başladığı veya geçtiği için dondurulamaz.',
      deadlineText,
    }
  }

  const isDeadlineToday =
    format(deadlineDay, 'yyyy-MM-dd') === format(istanbulDayStart, 'yyyy-MM-dd')
  if (isDeadlineToday && hour >= 12) {
    return {
      canFreeze: false,
      reason: `Mutfak hazırlığı başladığı için dondurma süresi doldu (Son işlem: ${deadlineText}).`,
      deadlineText,
    }
  }

  return {
    canFreeze: true,
    reason: `Son dondurma: ${deadlineText}`,
    deadlineText,
  }
}

/**
 * Adres Değişikliği Zaman Kuralı (İstanbul saati):
 * - Normal günler (Salı - Cumartesi): 1 gün önce en geç saat 14:00
 * - Pazar teslimatı: En geç Cuma saat 14:00
 * - Pazartesi teslimatı: En geç Cumartesi saat 12:00
 */
export function getAddressChangeEligibility(
  deliveryDateStr: string,
  now: Date = new Date()
): {
  canChange: boolean
  reason: string
  deadlineText: string
} {
  const { istanbulDayStart, hour } = getIstanbulNow(now)
  const targetDay = startOfDay(parseISO(deliveryDateStr))
  const dow = getDay(targetDay) // 0=Pazar, 1=Pazartesi ... 6=Cumartesi

  let deadlineDay: Date
  let deadlineHour: number

  if (dow === 1) {
    // Pazartesi teslimatı -> en geç Cumartesi 12:00
    deadlineDay = subDays(targetDay, 2)
    deadlineHour = 12
  } else if (dow === 0) {
    // Pazar teslimatı -> en geç Cuma 14:00
    deadlineDay = subDays(targetDay, 2)
    deadlineHour = 14
  } else {
    // Salı - Cumartesi teslimatları -> 1 gün önce 14:00
    deadlineDay = subDays(targetDay, 1)
    deadlineHour = 14
  }

  const deadlineText = `${format(deadlineDay, 'dd.MM.yyyy EEEE', { locale: tr })} saat ${String(
    deadlineHour
  ).padStart(2, '0')}:00`

  if (targetDay <= istanbulDayStart) {
    return {
      canChange: false,
      reason: 'Bu teslimat günü başladığı veya geçtiği için adres değiştirilemez.',
      deadlineText,
    }
  }

  const todayStr = format(istanbulDayStart, 'yyyy-MM-dd')
  const deadlineStr = format(deadlineDay, 'yyyy-MM-dd')

  if (todayStr > deadlineStr || (todayStr === deadlineStr && hour >= deadlineHour)) {
    return {
      canChange: false,
      reason: `${format(targetDay, 'dd.MM.yyyy EEEE', {
        locale: tr,
      })} teslimatı için adres değişikliği süresi doldu (Son işlem: ${deadlineText}). Acil durumlar için WhatsApp hattımızdan ulaşabilirsiniz.`,
      deadlineText,
    }
  }

  return {
    canChange: true,
    reason: `Son adres değişikliği: ${deadlineText}`,
    deadlineText,
  }
}

export function isDateSelectableForStart(
  date: Date,
  minPrepDays: number = 2,
  blockedDates: string[] = [],
  now: Date = new Date(),
  scheduleType: DeliveryScheduleType = 'every_day_sat_double'
): boolean {
  const earliest = getEarliestStartDate(minPrepDays, blockedDates, now)
  const target = startOfDay(date)

  if (target < earliest) return false
  if (blockedDates.includes(format(target, 'yyyy-MM-dd'))) return false

  if (isSunday(target)) {
    if (scheduleType !== 'every_day_sat_double') return false
    const prevSatStr = format(subDays(target, 1), 'yyyy-MM-dd')
    if (blockedDates.includes(prevSatStr)) return false
  }

  return true
}

/**
 * Seçilen Başlangıç Tarihi, Paket Gün Sayısı ve Teslimat Kuralına göre
 * tüm teslimat takvimini ve kesin Paket Bitiş Tarihini hesaplar.
 */
export function generateDeliverySchedule(
  startDateStr: string,
  totalPackageDays: number,
  scheduleType: DeliveryScheduleType,
  holidayDates: string[] = []
): {
  deliveries: ScheduledDeliveryDay[]
  estimatedEndDate: string
} {
  const holidaySet = new Set(holidayDates)
  const deliveries: ScheduledDeliveryDay[] = []

  let remainingPackages = totalPackageDays
  let currentDate = parseISO(startDateStr)
  let safetyCounter = 0

  if (
    isSunday(currentDate) &&
    scheduleType === 'every_day_sat_double' &&
    remainingPackages > 0
  ) {
    const prevSatStr = format(subDays(currentDate, 1), 'yyyy-MM-dd')
    if (!holidaySet.has(prevSatStr)) {
      deliveries.push({
        delivery_date: prevSatStr,
        package_quantity: 1,
      })
      remainingPackages -= 1
    }
    currentDate = addDays(currentDate, 1)
  }

  while (remainingPackages > 0 && safetyCounter < 365) {
    safetyCounter++
    const dateStr = format(currentDate, 'yyyy-MM-dd')

    if (holidaySet.has(dateStr)) {
      currentDate = addDays(currentDate, 1)
      continue
    }

    if (isSunday(currentDate)) {
      currentDate = addDays(currentDate, 1)
      continue
    }

    if (isSaturday(currentDate)) {
      if (scheduleType === 'weekdays_only') {
        currentDate = addDays(currentDate, 1)
        continue
      }

      if (scheduleType === 'every_day_sat_double') {
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