// src/lib/dispatch-excel.ts
import ExcelJS from 'exceljs'
import { differenceInCalendarDays, parseISO } from 'date-fns'

const toUpperTR = (val: any): string => String(val ?? '').toLocaleUpperCase('tr-TR')

export function getShortPackageName(rawTitle: string): string {
  const cleaned = String(rawTitle || '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .split(' - ')[0]
    .replace(/\s+/g, ' ')
    .trim()

  const lower = cleaned.toLocaleLowerCase('tr-TR')
  if (/(^|\s)21(\s|$)/.test(lower)) {
    if (lower.includes('glutensiz')) return 'Glutensiz 21 Günlük'
    return '21 Günlük'
  }

  const words = cleaned.split(' ').filter(Boolean)
  if (words.length <= 2) return cleaned || 'Diğer Paket'
  return `${words[0]} ${words[1]}`
}

function is21DayDetoxPackage(order: any): boolean {
  const title = String(order?.package_title || '').toLocaleLowerCase('tr-TR')
  const has21 = /(^|\s|\()21(\s|günlük|gunluk|$|\))/.test(title) || Number(order?.duration_days) === 21
  if (!has21) return false
  return title.includes('detoks') || title.includes('diyet') || title.includes('21 günlük') || title.includes('21 gunluk')
}

/**
 * 21 günlük paketlerde dondurulmuş günleri atlayarak seçili teslimatın
 * kaçıncı güne denk geldiğini hesaplar ve 1./2./3. Hafta veya JUİCE etiketini döner.
 */
function get21DayPhaseLabel(item: any, selectedDate: string, allDeliveries: any[] = []): string {
  const order = item?.orders || {}
  if (!is21DayDetoxPackage(order)) return ''

  const qty = Number(item?.package_quantity || 1)
  const orderDeliveries = (allDeliveries || [])
    .filter(
      (d) =>
        d.order_id === order.id &&
        ['scheduled', 'preparing', 'delivered'].includes(d.status)
    )
    .sort((a, b) => String(a.delivery_date || '').localeCompare(String(b.delivery_date || '')))

  let startDay = 1
  let endDay = qty

  if (orderDeliveries.length > 0) {
    let prevDays = 0
    for (const d of orderDeliveries) {
      if (d.id === item.id || d.delivery_date === selectedDate) {
        startDay = prevDays + 1
        endDay = prevDays + Number(d.package_quantity || 1)
        break
      }
      if (d.delivery_date < selectedDate) {
        prevDays += Number(d.package_quantity || 1)
      }
    }
  } else if (order.start_date) {
    try {
      const diff = differenceInCalendarDays(parseISO(selectedDate), parseISO(order.start_date)) + 1
      startDay = Math.max(1, diff)
      endDay = startDay + qty - 1
    } catch {
      startDay = 1
      endDay = qty
    }
  }

  if (startDay >= 20) return 'JUİCE'
  if (endDay >= 20) return '3. HAFTA + JUİCE'
  if (startDay <= 7) return '1. HAFTA'
  if (startDay <= 14) return '2. HAFTA'
  return '3. HAFTA'
}

export function extractCustomizationNote(order: any): string {
  const parts: string[] = []
  const rawTitle = String(order?.package_title || '')

  const bracketMatch = rawTitle.match(/\[(.*?)\]/)
  if (bracketMatch?.[1]) {
    parts.push(bracketMatch[1].trim())
  }

  if (order?.special_ops_note && String(order.special_ops_note).trim()) {
    parts.push(String(order.special_ops_note).trim())
  }

  return parts.length > 0 ? parts.join(' | ') : '-'
}

export function extractDietitianAndCalorieNote(order: any): string {
  const parts: string[] = []
  const rawTitle = String(order?.package_title || '')

  if (order?.dietitian_note && String(order.dietitian_note).trim()) {
    parts.push(String(order.dietitian_note).trim())
  }

  const dashSplit = rawTitle.split(' - ')
  if (dashSplit.length > 1) {
    const calPart = dashSplit[1].replace(/\[.*?\]/g, '').trim()
    if (calPart && !parts.includes(calPart)) {
      parts.push(calPart)
    }
  }

  return parts.length > 0 ? parts.join(' | ') : '-'
}

function isRecentlyChanged(
  order: any,
  field: 'package' | 'calorie' | 'address',
  targetDateStr: string
): boolean {
  const changedAt = order?.changed_fields?.[field]
  if (!changedAt || !targetDateStr) return false
  try {
    const diff = differenceInCalendarDays(
      parseISO(targetDateStr),
      parseISO(String(changedAt).slice(0, 10))
    )
    return diff >= 0 && diff <= 2
  } catch {
    return false
  }
}

function getCustomerGroupKey(order: any): string {
  const cleanPhone = String(order?.customer_phone || '').replace(/\D/g, '').slice(-10)
  const cleanName = String(order?.customer_name || '').trim().toLocaleLowerCase('tr-TR')
  return cleanPhone || cleanName || String(order?.id || Math.random())
}

export async function exportStyledDispatchExcel(
  dailyDispatchList: any[],
  selectedDate: string,
  allDeliveries: any[] = []
) {
  if (!dailyDispatchList || dailyDispatchList.length === 0) {
    alert('Seçilen tarihte sevkiyat bulunmuyor.')
    return
  }

  // 1) Aynı gün birden fazla paketi olan üyeleri grupla (her üyenin paketleri kendi içinde sıralı)
  const customerGroups = new Map<string, any[]>()
  dailyDispatchList.forEach((item) => {
    const key = getCustomerGroupKey(item.orders)
    const list = customerGroups.get(key) || []
    list.push(item)
    customerGroups.set(key, list)
  })

  // 2) Her üyenin kendi paketlerini paket adına göre sırala
  const groupedEntries = Array.from(customerGroups.values()).map((items) => {
    items.sort((a, b) => {
      const pkgA = getShortPackageName(a.orders?.package_title || '')
      const pkgB = getShortPackageName(b.orders?.package_title || '')
      return pkgA.localeCompare(pkgB, 'tr')
    })
    return items
  })

  // 3) Grupları ilk paket adına ve üye adına göre sırala -> aynı paketler alt alta, çoklu paketli üyeler bir arada!
  groupedEntries.sort((groupA, groupB) => {
    const pkgA = getShortPackageName(groupA[0]?.orders?.package_title || '')
    const pkgB = getShortPackageName(groupB[0]?.orders?.package_title || '')
    const cmpPkg = pkgA.localeCompare(pkgB, 'tr')
    if (cmpPkg !== 0) return cmpPkg

    const nameA = groupA[0]?.orders?.customer_name || ''
    const nameB = groupB[0]?.orders?.customer_name || ''
    return nameA.localeCompare(nameB, 'tr')
  })

  const sorted = groupedEntries.flat()

  const wb = new ExcelJS.Workbook()
  wb.creator = 'DietBox'
  wb.created = new Date()

  const ws = wb.addWorksheet(`SEVKİYAT_${selectedDate}`, {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.35,
        bottom: 0.35,
        header: 0.15,
        footer: 0.15,
      },
      printTitlesRow: '1:3',
    },
  })

  const headers = [
    'ADET',
    'AD SOYAD',
    'PAKET',
    'KALORİ / DİYETİSYEN',
    'ÖZELLEŞTİRME / ÖĞÜN',
    'ALERJEN / MUTFAK NOTU',
    'TELEFON',
    'İLÇE / MAHALLE & AÇIK ADRES',
    'SİPARİŞ NO',
  ]

  ws.columns = [
    { width: 11 }, // 1: ADET
    { width: 19 }, // 2: AD SOYAD
    { width: 21 }, // 3: PAKET
    { width: 16 }, // 4: KALORİ / DİYETİSYEN
    { width: 19 }, // 5: ÖZELLEŞTİRME / ÖĞÜN
    { width: 20 }, // 6: ALERJEN / MUTFAK NOTU
    { width: 14 }, // 7: TELEFON
    { width: 34 }, // 8: İLÇE / MAHALLE & AÇIK ADRES
    { width: 12 }, // 9: SİPARİŞ NO
  ]

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  }

  // 1. Satır: Üst Başlık
  ws.mergeCells(1, 1, 1, headers.length)
  const titleCell = ws.getCell('A1')
  titleCell.value = toUpperTR(`DIETBOX GÜNLÜK MUTFAK & SEVKİYAT LİSTESİ — ${selectedDate}`)
  titleCell.font = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1F18' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 26

  // 2. Satır: Renk Bilgilendirme
  ws.mergeCells(2, 1, 2, headers.length)
  const legendCell = ws.getCell('A2')
  legendCell.value = toUpperTR(
    'RENK BİLGİLENDİRME: SARI HÜCRE = SON 48 SAATTE ADRES / PAKET / KALORİ DEĞİŞİKLİĞİ'
  )
  legendCell.font = { name: 'Calibri', italic: true, size: 8, color: { argb: 'FF475569' } }
  legendCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
  legendCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(2).height = 16

  // 3. Satır: Tablo Başlıkları
  const headerRow = ws.getRow(3)
  headerRow.height = 24
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = toUpperTR(h)
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF51A885' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = thinBorder
  })

  sorted.forEach((item) => {
    const order = item.orders || {}
    const shortPkg = getShortPackageName(order.package_title || '')
    const phaseLabel = get21DayPhaseLabel(item, selectedDate, allDeliveries)
    const displayPkg = phaseLabel ? `${shortPkg} (${phaseLabel})` : shortPkg

    const qty = Number(item.package_quantity || 1)
    const dietitianInfo = extractDietitianAndCalorieNote(order)
    const customInfo = extractCustomizationNote(order)
    const allergenNote = (order.order_note || '').trim() || '-'

    const regionLine = [order.district_name, order.neighborhood_name].filter(Boolean).join(' / ')
    const addressBlock = [regionLine, order.full_address || ''].filter(Boolean).join('\n')

    const pkgChanged = isRecentlyChanged(order, 'package', selectedDate)
    const calChanged = isRecentlyChanged(order, 'calorie', selectedDate)
    const addrChanged = isRecentlyChanged(order, 'address', selectedDate)

    const row = ws.addRow([
      toUpperTR(qty > 1 ? `${qty} PAKET\n(ÇİFT)` : '1 PAKET'),
      toUpperTR(order.customer_name || '-'),
      toUpperTR(pkgChanged ? `${displayPkg}\n(PAKET DEĞİŞTİ)` : displayPkg),
      toUpperTR(calChanged ? `${dietitianInfo}\n(KALORİ DEĞİŞTİ)` : dietitianInfo),
      toUpperTR(customInfo),
      toUpperTR(allergenNote),
      toUpperTR(order.customer_phone || '-'),
      toUpperTR(addrChanged ? `[ADRES DEĞİŞTİ]\n${addressBlock}` : addressBlock),
      toUpperTR(order.order_number || '-'),
    ])

    const lineEstimate = Math.max(
      2,
      Math.ceil(addressBlock.length / 34) + (addrChanged ? 2 : 1)
    )
    row.height = Math.max(28, lineEstimate * 13)

    const isDouble = qty > 1
    const hasAllergen = allergenNote !== '-'

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      let fgColor = 'FFFFFFFF' // Değişiklik harici tüm hücreler beyaz
      let fontColor = 'FF0F172A'
      let isBold = colNumber === 2 || colNumber === 3

      // Sadece değişiklik olan hücreler sarı
      if (colNumber === 3 && pkgChanged) {
        fgColor = 'FFFDE047'
        fontColor = 'FF713F12'
        isBold = true
      } else if (colNumber === 4 && calChanged) {
        fgColor = 'FFFDE047'
        fontColor = 'FF713F12'
        isBold = true
      } else if (colNumber === 8 && addrChanged) {
        fgColor = 'FFFDE047'
        fontColor = 'FF713F12'
        isBold = true
      } else if ((colNumber === 1 && isDouble) || (colNumber === 6 && hasAllergen)) {
        isBold = true
      }

      cell.font = { name: 'Calibri', bold: isBold, size: 9, color: { argb: fontColor } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fgColor } }
      cell.alignment = {
        horizontal: colNumber === 1 || colNumber === 9 ? 'center' : 'left',
        vertical: 'middle',
        wrapText: true,
      }
      cell.border = thinBorder
    })
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `DietBox_Sevkiyat_${selectedDate}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}