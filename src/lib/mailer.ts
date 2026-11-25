// src/lib/mailer.ts
import nodemailer from 'nodemailer'

function createTransporter() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass || pass.includes('buraya')) {
    return null
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  })
}

function wrapEmailLayout(title: string, contentHtml: string) {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #f4f7f5; padding: 24px; color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background-color: #0d1f18; padding: 22px 28px; border-bottom: 4px solid #eab130;">
          <h1 style="margin: 0; color: #ffffff; font-size: 20px; letter-spacing: 0.5px;">
            DIET<span style="color: #51a885;">BOX</span> — ${title}
          </h1>
        </div>
        <div style="padding: 28px; font-size: 14px; line-height: 1.6; color: #334155;">
          ${contentHtml}
        </div>
        <div style="background-color: #f8fafc; padding: 16px 28px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center;">
          DietBox Adrese Teslim Diyet Yemekleri Servisi • 0 216 367 24 13 • info@dietboxtr.com
        </div>
      </div>
    </div>
  `
}

async function sendSafeMail(to: string, subject: string, html: string) {
  try {
    const transporter = createTransporter()
    if (!transporter || !to) return false

    await transporter.sendMail({
      from: `"DietBox Türkiye" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    })
    return true
  } catch (err) {
    console.error('Gmail SMTP gönderim hatası:', err)
    return false
  }
}

// 1. YENİ SİPARİŞ ÇİFT TARAFLI MAİL (Müşteriye + Admine)
export async function sendOrderEmails(order: {
  orderNumber: string
  customerName: string
  customerEmail?: string | null
  customerPhone: string
  packageTitle: string
  durationDays: number
  startDate: string
  estimatedEndDate: string
  districtName: string
  neighborhoodName: string
  fullAddress: string
  grandTotal: number
  orderNote?: string | null
}) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.GMAIL_USER || ''
  const formattedTotal = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(order.grandTotal)

  const summaryTable = `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Sipariş No:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${order.orderNumber}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Müşteri:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${order.customerName} (${order.customerPhone})</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Paket:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${order.packageTitle} (${order.durationDays} Gün)</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Teslimat Tarihleri:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${order.startDate} &rarr; ${order.estimatedEndDate}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Bölge / Adres:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${order.districtName} / ${order.neighborhoodName} — ${order.fullAddress}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Alerjen / Not:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #b91c1c;">${order.orderNote || 'Belirtilmedi'}</td></tr>
      <tr><td style="padding: 8px;"><strong>Toplam Tutar:</strong></td><td style="padding: 8px; font-size: 16px; color: #51a885;"><strong>${formattedTotal}</strong></td></tr>
    </table>
  `

  // Müşteriye giden mail
  if (order.customerEmail) {
    await sendSafeMail(
      order.customerEmail,
      `DietBox Siparişiniz Onaylandı (${order.orderNumber})`,
      wrapEmailLayout(
        'Sipariş Onayı',
        `<p>Merhaba <strong>${order.customerName}</strong>,</p>
         <p>Siparişiniz başarıyla alınmış ve mutfak üretim takvimimize eklenmiştir. Paketleriniz sabah 06:00 - 09:30 aralığında kapınıza teslim edilecektir.</p>
         ${summaryTable}
         <p>Teslimat günlerinizi takip etmek veya dondurmak için sitemizdeki <strong>Hesabım / Sipariş Takibi</strong> bölümünü kullanabilirsiniz.</p>`
      )
    )
  }

  // Admine giden mail
  if (adminEmail) {
    await sendSafeMail(
      adminEmail,
      `Yeni DietBox Siparişi: ${order.orderNumber} — ${order.customerName}`,
      wrapEmailLayout(
        'Yeni Sipariş Bildirimi',
        `<p>Siteden yeni bir diyet paketi siparişi alındı:</p>${summaryTable}`
      )
    )
  }
}

// 2. PAKET / GÜN DONDURMA ÇİFT TARAFLI MAİL (Müşteriye + Admine)
export async function sendFreezeEmails(info: {
  orderNumber: string
  customerName: string
  customerEmail?: string | null
  customerPhone: string
  frozenDate: string
  newEndDate: string
}) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.GMAIL_USER || ''

  const bodyHtml = `
    <p><strong>${info.orderNumber}</strong> numaralı sipariş için teslimat dondurma işlemi gerçekleştirilmiştir:</p>
    <ul>
      <li><strong>Müşteri:</strong> ${info.customerName} (${info.customerPhone})</li>
      <li><strong>Dondurulan Teslimat Günü:</strong> ${info.frozenDate}</li>
      <li><strong>Otomatik Eklenen Yeni Bitiş Tarihi:</strong> <span style="color:#51a885;font-weight:bold;">${info.newEndDate}</span></li>
    </ul>
  `

  if (info.customerEmail) {
    await sendSafeMail(
      info.customerEmail,
      `DietBox Teslimat Dondurma Onayı (${info.frozenDate})`,
      wrapEmailLayout('Teslimat Günü Donduruldu', `<p>Merhaba <strong>${info.customerName}</strong>,</p>${bodyHtml}`)
    )
  }

  if (adminEmail) {
    await sendSafeMail(
      adminEmail,
      `Mutfak & Kurye Uyarı: Gün Donduruldu (${info.orderNumber} - ${info.frozenDate})`,
      wrapEmailLayout('Gün Dondurma Bildirimi', bodyHtml)
    )
  }
}

// 3. YENİ ÜYELİK KAYDI ÇİFT TARAFLI MAİL (Müşteriye + Admine)
export async function sendWelcomeEmails(user: {
  fullName: string
  email: string
  phone?: string
}) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.GMAIL_USER || ''

  await sendSafeMail(
    user.email,
    'DietBox Ailesine Hoş Geldiniz!',
    wrapEmailLayout(
      'Hoş Geldiniz',
      `<p>Merhaba <strong>${user.fullName}</strong>,</p>
       <p>DietBox üyeliğiniz başarıyla oluşturuldu. Müşteri panelinizden teslimat adresinizi, boy/kilo ve kalori bilgilerinizi kaydedebilir, aktif siparişlerinizi ve gün dondurma işlemlerinizi kolayca yönetebilirsiniz.</p>`
    )
  )

  if (adminEmail) {
    await sendSafeMail(
      adminEmail,
      `Yeni Üye Kaydı: ${user.fullName}`,
      wrapEmailLayout(
        'Yeni Müşteri Kaydı',
        `<p>Siteye yeni bir müşteri kayıt oldu:</p>
         <ul>
           <li><strong>Ad Soyad:</strong> ${user.fullName}</li>
           <li><strong>E-Posta:</strong> ${user.email}</li>
           <li><strong>Telefon:</strong> ${user.phone || '-'}</li>
         </ul>`
      )
    )
  }
}