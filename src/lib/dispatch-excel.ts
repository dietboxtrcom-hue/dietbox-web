// src/lib/dispatch-excel.ts
import ExcelJS from 'exceljs'
import { differenceInCalendarDays, parseISO } from 'date-fns'

export function getShortPackageName(rawTitle: string): string {
  const cleaned = String(rawTitle || '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .split(' - ')[0]
    .replace(/\s+/g, ' ')
    .trim()

  const words = cleaned.split(' ').filter(Boolean)
  if (words.length <= 2) return cleaned || 'Diğer Paket'
  return `${words[0]} ${words[1]}`
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

export async function exportStyledDispatchExcel(dailyDispatchList: any[], selectedDate: string) {
  if (!dailyDispatchList || dailyDispatchList.length === 0) {
    alert('Seçilen tarihte sevkiyat bulunmuyor.')
    return
  }

  // Aynı paketler alt alta gelecek şekilde sırala (kendi içinde Ad Soyad sırası)
  const sorted = [...dailyDispatchList].sort((a, b) => {
    const pkgA = getShortPackageName(a.orders?.package_title || '')
    const pkgB = getShortPackageName(b.orders?.package_title || '')
    const cmpPkg = pkgA.localeCompare(pkgB, 'tr')
    if (cmpPkg !== 0) return cmpPkg

    return (a.orders?.customer_name || '').localeCompare(b.orders?.customer_name || '', 'tr')
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'DietBox'
  wb.created = new Date()

  const ws = wb.addWorksheet(`Sevkiyat_${selectedDate}`, {
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
    'Adet',
    'Ad Soyad',
    'Paket',
    'Kalori / Diyetisyen',
    'Özelleştirme / Öğün',
    'Alerjen / Mutfak Notu',
    'Telefon',
    'İlçe / Mahalle & Açık Adres',
    'Sipariş No',
  ]

  ws.columns = [
    { width: 11 }, // 1: Adet
    { width: 19 }, // 2: Ad Soyad
    { width: 18 }, // 3: Paket
    { width: 16 }, // 4: Kalori / Diyetisyen
    { width: 19 }, // 5: Özelleştirme / Öğün
    { width: 20 }, // 6: Alerjen / Mutfak Notu
    { width: 14 }, // 7: Telefon
    { width: 34 }, // 8: İlçe / Mahalle & Açık Adres
    { width: 12 }, // 9: Sipariş No
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
  titleCell.value = `DIETBOX GÜNLÜK MUTFAK & SEVKİYAT LİSTESİ — ${selectedDate}`
  titleCell.font = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1F18' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 26

  // 2. Satır: Renk Bilgilendirme
  ws.mergeCells(2, 1, 2, headers.length)
  const legendCell = ws.getCell('A2')
  legendCell.value =
    'Renk Bilgilendirme: Sarı Hücre = Son 48 saatte Adres / Paket / Kalori Değişikliği   |   Mavi Hücre = Özelleştirme   |   Kırmızı Hücre = Alerjen / Kısıt'
  legendCell.font = { name: 'Calibri', italic: true, size: 8, color: { argb: 'FF475569' } }
  legendCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
  legendCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(2).height = 16

  // 3. Satır: Tablo Başlıkları
  const headerRow = ws.getRow(3)
  headerRow.height = 24
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF51A885' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = thinBorder
  })

  // Paket grubu bazlı hafif arka plan renkleri
  const groupColors = ['FFFFFFFF', 'FFF0FDF4', 'FFEFF6FF', 'FFF5F3FF', 'FFFFF7ED']
  const pkgColorMap = new Map<string, string>()
  let colorCursor = 0

  sorted.forEach((item) => {
    const order = item.orders || {}
    const shortPkg = getShortPackageName(order.package_title || '')
    if (!pkgColorMap.has(shortPkg)) {
      pkgColorMap.set(shortPkg, groupColors[colorCursor % groupColors.length])
      colorCursor++
    }

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
      qty > 1 ? `${qty} PAKET\n(ÇİFT)` : '1 Paket',
      order.customer_name || '-',
      pkgChanged ? `${shortPkg}\n(PAKET DEĞİŞTİ)` : shortPkg,
      calChanged ? `${dietitianInfo}\n(KALORİ DEĞİŞTİ)` : dietitianInfo,
      customInfo,
      allergenNote,
      order.customer_phone || '-',
      addrChanged ? `[ADRES DEĞİŞTİ]\n${addressBlock}` : addressBlock,
      order.order_number || '-',
    ])

    const lineEstimate = Math.max(
      2,
      Math.ceil(addressBlock.length / 34) + (addrChanged ? 2 : 1)
    )
    row.height = Math.max(28, lineEstimate * 13)

    const baseFill = pkgColorMap.get(shortPkg) || 'FFFFFFFF'
    const isDouble = qty > 1
    const hasCustom = customInfo !== '-'
    const hasAllergen = allergenNote !== '-'

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      let fgColor = baseFill
      let fontColor = 'FF0F172A'
      let isBold = colNumber === 2 || colNumber === 3

      if (colNumber === 1 && isDouble) {
        fgColor = 'FFFEF08A' // Sarı vurgu (Çift Paket)
        fontColor = 'FF854D0E'
        isBold = true
      } else if (colNumber === 3 && pkgChanged) {
        fgColor = 'FFFDE047' // Canlı sarı (Paket Değişti)
        fontColor = 'FF713F12'
        isBold = true
      } else if (colNumber === 4 && calChanged) {
        fgColor = 'FFFDE047' // Canlı sarı (Kalori Değişti)
        fontColor = 'FF713F12'
        isBold = true
      } else if (colNumber === 5 && hasCustom) {
        fgColor = 'FFE0E7FF' // Açık indigo (Özelleştirme)
        fontColor = 'FF3730A3'
        isBold = true
      } else if (colNumber === 6 && hasAllergen) {
        fgColor = 'FFFEE2E2' // Açık kırmızı (Alerjen)
        fontColor = 'FF991B1B'
        isBold = true
      } else if (colNumber === 8 && addrChanged) {
        fgColor = 'FFFDE047' // Canlı sarı (Adres Değişti)
        fontColor = 'FF713F12'
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