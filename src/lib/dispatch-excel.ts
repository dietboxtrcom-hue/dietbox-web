// src/lib/dispatch-excel.ts
// @ts-ignore - xlsx-js-style tip tanımı içermediği için TS derlemesini korur
import XLSX from 'xlsx-js-style'

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

export function extractDietitianAndCalorieNote(order: any): string {
  const parts: string[] = []
  const rawTitle = String(order?.package_title || '')

  // 1. Admin / Diyetisyen tarafından girilen özel not
  if (order?.dietitian_note && String(order.dietitian_note).trim()) {
    parts.push(String(order.dietitian_note).trim())
  }

  // 2. Paket adındaki [Laktozsuz • Kahvaltısız] özelleştirmelerini yakala
  const bracketMatch = rawTitle.match(/\[(.*?)\]/)
  if (bracketMatch?.[1]) {
    parts.push(bracketMatch[1].trim())
  }

  // 3. Paket adındaki "- 1500 Kcal" veya "- Diyetisyen Belirlesin" bilgisini yakala
  const dashSplit = rawTitle.split(' - ')
  if (dashSplit.length > 1) {
    const calPart = dashSplit[1].replace(/\[.*?\]/g, '').trim()
    if (calPart) parts.push(calPart)
  }

  // 4. Özel operasyon notu (Juice / Telafi vb.)
  if (order?.special_ops_note && String(order.special_ops_note).trim()) {
    parts.push(`Özel: ${String(order.special_ops_note).trim()}`)
  }

  return parts.length > 0 ? parts.join(' | ') : '-'
}

export function exportStyledDispatchExcel(dailyDispatchList: any[], selectedDate: string) {
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

  const headers = [
    'Sıra',
    'Paket (Kısa)',
    'Adet',
    'Kalori / Diyetisyen Notu',
    'Alerjen / Mutfak Notu',
    'Müşteri',
    'Telefon',
    'İlçe',
    'Mahalle',
    'Açık Adres',
    'Sipariş No',
  ]

  const aoa: any[][] = [
    [`DIETBOX GÜNLÜK MUTFAK & SEVKİYAT LİSTESİ — ${selectedDate}`],
    [],
    headers,
  ]

  const groupColors = ['FFFFFF', 'F0FDF4', 'EFF6FF', 'FEFCE8', 'F5F3FF', 'FFF7ED']
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
    const allergenNote = (item.orders?.order_note || '').trim() || '-'

    aoa.push([
      idx + 1,
      shortPkg,
      qty > 1 ? `${qty} PAKET (ÇİFT)` : '1 Paket',
      dietitianInfo,
      allergenNote,
      item.orders?.customer_name || '-',
      item.orders?.customer_phone || '-',
      item.orders?.district_name || '-',
      item.orders?.neighborhood_name || '-',
      item.orders?.full_address || '-',
      item.orders?.order_number || '-',
    ])
  })

  // Alt Özet Tablosu (Mutfak Paket Sayıları)
  const summaryStartRow = aoa.length + 1
  aoa.push([])
  aoa.push(['MUTFAK PAKET ÖZETİ', 'TOPLAM ADET'])
  let grandTotalPackages = 0
  Array.from(pkgCounts.entries()).forEach(([pkgName, count]) => {
    aoa.push([pkgName, count])
    grandTotalPackages += count
  })
  aoa.push(['GENEL TOPLAM PAKET', grandTotalPackages])

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Başlık birleştirme
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }]

  // Sütun genişlikleri
  ws['!cols'] = [
    { wch: 6 },  // Sıra
    { wch: 22 }, // Paket (Kısa)
    { wch: 16 }, // Adet
    { wch: 30 }, // Kalori / Diyetisyen Notu
    { wch: 28 }, // Alerjen / Not
    { wch: 22 }, // Müşteri
    { wch: 15 }, // Telefon
    { wch: 14 }, // İlçe
    { wch: 22 }, // Mahalle
    { wch: 38 }, // Açık Adres
    { wch: 14 }, // Sipariş No
  ]

  const thinBorder = {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } },
  }

  // 1. Satır: Üst Banner Stili
  if (ws['A1']) {
    ws['A1'].s = {
      font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '0D1F18' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    }
  }

  // 3. Satır: Tablo Başlıkları
  for (let c = 0; c < headers.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 2, c })
    if (ws[ref]) {
      ws[ref].s = {
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '51A885' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: thinBorder,
      }
    }
  }

  // Veri Satırları
  for (let i = 0; i < sorted.length; i++) {
    const r = i + 3
    const item = sorted[i]
    const shortPkg = getShortPackageName(item.orders?.package_title || '')
    const baseFill = pkgColorMap.get(shortPkg) || 'FFFFFF'
    const isDouble = Number(item.package_quantity || 1) > 1
    const hasAllergen = Boolean((item.orders?.order_note || '').trim())

    for (let c = 0; c < headers.length; c++) {
      const ref = XLSX.utils.encode_cell({ r, c })
      if (!ws[ref]) continue

      let cellFill = baseFill
      let fontColor = '0F172A'
      let isBold = c === 1 || c === 5

      if (c === 2 && isDouble) {
        cellFill = 'FEF08A' // Sarı vurgu (Çift Paket)
        fontColor = '854D0E'
        isBold = true
      }
      if (c === 4 && hasAllergen) {
        cellFill = 'FEE2E2' // Açık kırmızı vurgu (Alerjen)
        fontColor = '991B1B'
        isBold = true
      }

      ws[ref].s = {
        font: { bold: isBold, sz: 10, color: { rgb: fontColor } },
        fill: { fgColor: { rgb: cellFill } },
        alignment: {
          horizontal: c === 0 || c === 2 ? 'center' : 'left',
          vertical: 'center',
          wrapText: true,
        },
        border: thinBorder,
      }
    }
  }

  // Özet Tablosu Stilleri
  for (let c = 0; c < 2; c++) {
    const headRef = XLSX.utils.encode_cell({ r: summaryStartRow, c })
    if (ws[headRef]) {
      ws[headRef].s = {
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '0D1F18' } },
        alignment: { horizontal: c === 1 ? 'center' : 'left', vertical: 'center' },
        border: thinBorder,
      }
    }
  }

  for (let r = summaryStartRow + 1; r < aoa.length; r++) {
    const isGrand = r === aoa.length - 1
    for (let c = 0; c < 2; c++) {
      const ref = XLSX.utils.encode_cell({ r, c })
      if (ws[ref]) {
        ws[ref].s = {
          font: { bold: isGrand || c === 1, sz: 10, color: { rgb: isGrand ? '065F46' : '0F172A' } },
          fill: { fgColor: { rgb: isGrand ? 'D1FAE5' : 'F8FAFC' } },
          alignment: { horizontal: c === 1 ? 'center' : 'left', vertical: 'center' },
          border: thinBorder,
        }
      }
    }
  }

  ws['!rows'] = [{ hpt: 28 }, { hpt: 8 }, { hpt: 24 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `Sevkiyat_${selectedDate}`)
  XLSX.writeFile(wb, `DietBox_Sevkiyat_${selectedDate}.xlsx`)
}