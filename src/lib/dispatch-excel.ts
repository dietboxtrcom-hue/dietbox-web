// src/lib/dispatch-excel.ts
import ExcelJS from 'exceljs'

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

/**
 * Sadece [Laktozsuz • Süt Ürünsüz • Kahvaltısız • 1 Ara Öğünsüz] gibi
 * paket özelleştirmelerini ve özel operasyon (Juice/Telafi) notlarını döner.
 */
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

/**
 * Sadece Kalori ve Diyetisyen Notu bilgisini döner (Süt Ürünsüz / Öğün Çıkarma hariç).
 */
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

export async function exportStyledDispatchExcel(dailyDispatchList: any[], selectedDate: string) {
  if (!dailyDispatchList || dailyDispatchList.length === 0) {
    alert('Seçilen tarihte sevkiyat bulunmuyor.')
    return
  }

  // Aynı paketler alt alta gelecek şekilde sırala (sonra İlçe -> Mahalle)
  const sorted = [...dailyDispatchList].sort((a, b) => {
    const pkgA = getShortPackageName(a.orders?.package_title || '')
    const pkgB = getShortPackageName(b.orders?.package_title || '')
    const cmpPkg = pkgA.localeCompare(pkgB, 'tr')
    if (cmpPkg !== 0) return cmpPkg

    const distA = a.orders?.district_name || ''
    const distB = b.orders?.district_name || ''
    const cmpDist = distA.localeCompare(distB, 'tr')
    if (cmpDist !== 0) return cmpDist

    return (a.orders?.neighborhood_name || '').localeCompare(
      b.orders?.neighborhood_name || '',
      'tr'
    )
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
      printTitlesRow: '1:3', // Çok sayfalı çıktıda başlıklar her sayfada tekrarlanır
    },
  })

  const headers = [
    '#',
    'Paket',
    'Adet',
    'Kalori / Diyetisyen',
    'Özelleştirme / Öğün',
    'Alerjen / Mutfak Notu',
    'Müşteri & Telefon',
    'İlçe / Mahalle & Açık Adres',
    'Sipariş No',
  ]

  // Sütun genişlikleri (Toplam ~152 karakter -> A4 Yatay baskıda net ve kırpılmadan oturur)
  ws.columns = [
    { width: 5 },  // #
    { width: 18 }, // Paket
    { width: 11 }, // Adet
    { width: 17 }, // Kalori / Diyetisyen
    { width: 19 }, // Özelleştirme / Öğün
    { width: 20 }, // Alerjen / Mutfak Notu
    { width: 20 }, // Müşteri & Telefon
    { width: 34 }, // İlçe / Mahalle & Açık Adres
    { width: 12 }, // Sipariş No
  ]

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  }

  // 1. Satır: Üst Başlık Bannerı
  ws.mergeCells(1, 1, 1, headers.length)
  const titleCell = ws.getCell('A1')
  titleCell.value = `DIETBOX GÜNLÜK MUTFAK & SEVKİYAT LİSTESİ — ${selectedDate}`
  titleCell.font = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1F18' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 28

  // 2. Satır: Boşluk
  ws.getRow(2).height = 6

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

  // Grup renkleri
  const groupColors = ['FFFFFFFF', 'FFF0FDF4', 'FFEFF6FF', 'FFFEFCE8', 'FFF5F3FF', 'FFFFF7ED']
  const pkgColorMap = new Map<string, string>()
  const pkgCounts = new Map<string, number>()
  let colorCursor = 0

  sorted.forEach((item, idx) => {
    const shortPkg = getShortPackageName(item.orders?.package_title || '')
    if (!pkgColorMap.has(shortPkg)) {
      pkgColorMap.set(shortPkg, groupColors[colorCursor % groupColors.length])
      colorCursor++
    }

    const qty = Number(item.package_quantity || 1)
    pkgCounts.set(shortPkg, (pkgCounts.get(shortPkg) || 0) + qty)

    const dietitianInfo = extractDietitianAndCalorieNote(item.orders)
    const customInfo = extractCustomizationNote(item.orders)
    const allergenNote = (item.orders?.order_note || '').trim() || '-'

    const customerBlock = [item.orders?.customer_name || '-', item.orders?.customer_phone || '']
      .filter(Boolean)
      .join('\n')

    const regionLine = [item.orders?.district_name, item.orders?.neighborhood_name]
      .filter(Boolean)
      .join(' / ')
    const addressBlock = [regionLine, item.orders?.full_address || ''].filter(Boolean).join('\n')

    const row = ws.addRow([
      idx + 1,
      shortPkg,
      qty > 1 ? `${qty} PAKET\n(ÇİFT)` : '1 Paket',
      dietitianInfo,
      customInfo,
      allergenNote,
      customerBlock,
      addressBlock,
      item.orders?.order_number || '-',
    ])

    // Adres uzunluğuna göre satır yüksekliğini dinamik ayarla
    const lineEstimate = Math.max(2, Math.ceil(addressBlock.length / 34) + 1)
    row.height = Math.max(30, lineEstimate * 13)

    const baseFill = pkgColorMap.get(shortPkg) || 'FFFFFFFF'
    const isDouble = qty > 1
    const hasCustom = customInfo !== '-'
    const hasAllergen = allergenNote !== '-'

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      let fgColor = baseFill
      let fontColor = 'FF0F172A'
      let isBold = colNumber === 2 || colNumber === 7

      if (colNumber === 3 && isDouble) {
        fgColor = 'FFFEF08A' // Sarı vurgu (Çift Paket)
        fontColor = 'FF854D0E'
        isBold = true
      } else if (colNumber === 5 && hasCustom) {
        fgColor = 'FFE0E7FF' // Açık indigo vurgu (Özelleştirme)
        fontColor = 'FF3730A3'
        isBold = true
      } else if (colNumber === 6 && hasAllergen) {
        fgColor = 'FFFEE2E2' // Açık kırmızı vurgu (Alerjen)
        fontColor = 'FF991B1B'
        isBold = true
      }

      cell.font = { name: 'Calibri', bold: isBold, size: 9, color: { argb: fontColor } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fgColor } }
      cell.alignment = {
        horizontal: colNumber === 1 || colNumber === 3 || colNumber === 9 ? 'center' : 'left',
        vertical: 'middle',
        wrapText: true,
      }
      cell.border = thinBorder
    })
  })

  // Alt Özet Tablosu (Mutfak Paket Sayıları)
  ws.addRow([])
  const summaryHeaderRow = ws.addRow(['MUTFAK PAKET ÖZETİ', '', 'TOPLAM ADET'])
  summaryHeaderRow.height = 22
  ws.mergeCells(summaryHeaderRow.number, 1, summaryHeaderRow.number, 2)
  for (let c = 1; c <= 3; c++) {
    const cell = summaryHeaderRow.getCell(c)
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1F18' } }
    cell.alignment = { horizontal: c === 3 ? 'center' : 'left', vertical: 'middle' }
    cell.border = thinBorder
  }

  let grandTotalPackages = 0
  Array.from(pkgCounts.entries()).forEach(([pkgName, count]) => {
    grandTotalPackages += count
    const r = ws.addRow([pkgName, '', count])
    r.height = 19
    ws.mergeCells(r.number, 1, r.number, 2)
    for (let c = 1; c <= 3; c++) {
      const cell = r.getCell(c)
      cell.font = { name: 'Calibri', bold: c === 3, size: 9, color: { argb: 'FF0F172A' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
      cell.alignment = { horizontal: c === 3 ? 'center' : 'left', vertical: 'middle' }
      cell.border = thinBorder
    }
  })

  const grandRow = ws.addRow(['GENEL TOPLAM PAKET', '', grandTotalPackages])
  grandRow.height = 21
  ws.mergeCells(grandRow.number, 1, grandRow.number, 2)
  for (let c = 1; c <= 3; c++) {
    const cell = grandRow.getCell(c)
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF065F46' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
    cell.alignment = { horizontal: c === 3 ? 'center' : 'left', vertical: 'middle' }
    cell.border = thinBorder
  }

  // Tarayıcıdan .xlsx olarak indir
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