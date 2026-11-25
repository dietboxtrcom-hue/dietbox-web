// src/app/iletisim/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import {
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  CheckCircle2,
  Send,
  Truck,
  ShieldCheck,
  Home,
  ChevronRight,
  Navigation,
  Building2,
} from 'lucide-react'

export default function ContactPage() {
  const [menus, setMenus] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [kvkkAccepted, setKvkkAccepted] = useState(false)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const [mRes, sRes] = await Promise.all([
        supabase.from('navigation_menus').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('system_settings').select('value').eq('key', 'general_settings').single(),
      ])
      setMenus(mRes.data || [])
      if (sRes.data?.value) setSettings(sRes.data.value)
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kvkkAccepted) {
      alert('Lütfen KVKK aydınlatma metnini onaylayın.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    await supabase.from('contact_messages').insert({
      full_name: fullName,
      email,
      phone,
      message,
    })
    setLoading(false)
    setSent(true)
    setFullName('')
    setEmail('')
    setPhone('')
    setMessage('')
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-900 flex flex-col justify-between">
      <SiteHeader menus={menus} generalSettings={settings} />

      {/* İnce, Şık & Flu Arka Planlı Editorial Breadcrumb Bandı */}
      <section className="relative w-full overflow-hidden border-b border-slate-200/80 bg-[#0d1f18]">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 blur-[4px] opacity-30"
          style={{
            backgroundImage:
              "url('https://www.dietboxtr.com/wp-content/uploads/2020/07/dietbox-19.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1f18]/92 via-[#0d1f18]/80 to-[#0d1f18]/70" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-2.5">
          <nav className="flex items-center gap-1.5 text-[11px] font-semibold text-white/65">
            <Link href="/" className="hover:text-[#eab130] flex items-center gap-1 transition">
              <Home className="w-3 h-3" />
              Anasayfa
            </Link>
            <ChevronRight className="w-3 h-3 text-white/35" />
            <span className="text-[#eab130] font-bold">İletişim</span>
          </nav>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            İletişim & Bize Ulaşın
          </h1>
          <p className="text-xs sm:text-sm text-white/75 max-w-2xl">
            Diyet paketlerimiz, kalori planlaması, kurumsal iş birlikleri veya teslimat bölgelerimiz hakkında her zaman yanınızdayız.
          </p>
        </div>
      </section>

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* 2 Sütunlu İletişim Bilgileri & İletişim Formu */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sol: İletişim Bilgileri */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">İletişim Bilgileri</h2>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#51a885] shrink-0" />
                Mesa Tüketim Maddeleri Gıda İnşaat Enerji San. ve Ticaret Ltd. Şti.
              </p>
            </div>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-[#0d1f18] text-white flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-[#eab130]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Merkez Mutfak & Adres</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    {settings?.address ||
                      'Aydınevler Mah. Kırçiçeği Cd. 34854 Maltepe / İstanbul'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-[#0d1f18] text-white flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-[#51a885]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Canlı Destek</h3>
                  <a
                    href={`tel:${(settings?.phone || '02163672413').replace(/\s+/g, '')}`}
                    className="text-xs sm:text-sm text-[#51a885] font-bold hover:underline mt-0.5 block"
                  >
                    {settings?.phone || '0 216 367 24 13'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-[#0d1f18] text-white flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-[#eab130]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">E-posta Destek</h3>
                  <a
                    href={`mailto:${settings?.email || 'info@dietboxtr.com'}`}
                    className="text-xs sm:text-sm text-slate-600 hover:text-[#51a885] mt-0.5 block"
                  >
                    {settings?.email || 'info@dietboxtr.com'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-[#51a885] text-white flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">WhatsApp Destek</h3>
                  <a
                    href={`https://wa.me/${(settings?.whatsapp || '905421482021').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs sm:text-sm text-[#51a885] font-bold hover:underline mt-0.5 block"
                  >
                    {settings?.whatsapp_display || '0 542 148 20 21'}
                  </a>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed pt-4 border-t border-slate-100">
              Yukarıdaki iletişim kanallarından bize dilediğiniz zaman ulaşabilirsiniz. Aklınıza takılan her konuda diyetisyen ve operasyon ekibimizle destek vermekten mutluluk duyarız.
            </p>
          </div>

          {/* Sağ: İletişim Formu */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">İletişim Formu</h2>
              <p className="text-sm text-slate-500 mt-0.5">Bize Mesaj Gönderin.</p>
            </div>

            {sent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[#51a885] mx-auto" />
                <h3 className="font-extrabold text-emerald-950 text-base">
                  Mesajınız Başarıyla İletildi!
                </h3>
                <p className="text-xs text-emerald-800">
                  Diyetisyen ve müşteri ilişkileri ekibimiz en kısa sürede sizinle iletişime geçecektir.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  required
                  placeholder="Adınız Soyadınız"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-[#51a885]"
                />
                <input
                  type="email"
                  required
                  placeholder="E-mail Adresiniz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-[#51a885]"
                />
                <input
                  type="tel"
                  required
                  placeholder="Telefon Numaranız"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-[#51a885]"
                />
                <textarea
                  rows={4}
                  required
                  placeholder="Mesajınız (Kalori hedefiniz, alerjen durumunuz veya teslimat bölgeniz hakkında sorabilirsiniz)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-[#51a885]"
                />

                <label className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kvkkAccepted}
                    onChange={(e) => setKvkkAccepted(e.target.checked)}
                    className="w-4 h-4 accent-[#51a885]"
                  />
                  <span>
                    Bu formu doldurarak{' '}
                    <Link
                      href="/kurumsal/kvkk"
                      target="_blank"
                      className="text-[#51a885] font-bold underline hover:text-[#0d1f18]"
                    >
                      KVKK Aydınlatma Metni
                    </Link>{' '}
                    koşullarını kabul ettiğimi beyan ederim.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#51a885] hover:bg-[#3f8d6d] text-white font-extrabold text-sm px-8 py-3.5 rounded-xl transition flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {loading ? 'Gönderiliyor...' : 'MESAJI GÖNDER'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bilgilendirici Kurumsal & Operasyon Kutuları */}
        <section id="teslimat-bilgisi" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-2">
            <Clock className="w-6 h-6 text-[#51a885]" />
            <h3 className="font-extrabold text-slate-900 text-sm">Sabah 06:00 - 09:30 Teslimat</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tüm paketlerimiz gece üretilip soğuk zincir araçlarımızla sabah 06:00 - 09:30 saatleri arasında ev veya iş yeri adresinize teslim edilir.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-2">
            <Truck className="w-6 h-6 text-[#51a885]" />
            <h3 className="font-extrabold text-slate-900 text-sm">Cumartesi Çift Paket Sistemi</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pazar günü kurye dağıtımı yapılmamakta olup, &ldquo;Her Gün&rdquo; aboneliği seçen müşterilerimize Cumartesi sabahı hem Cumartesi hem Pazar paketi (farklı menülerle) teslim edilir.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-2">
            <ShieldCheck className="w-6 h-6 text-[#51a885]" />
            <h3 className="font-extrabold text-slate-900 text-sm">Esnek Paket Dondurma</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Acil seyahat veya tatil durumlarında teslimatınızı Müşteri Panelinizden dondurabilir, dondurduğunuz günlerin paket sonuna eklenmesini sağlayabilirsiniz.
            </p>
          </div>
        </section>

        {/* Google Harita — Tam Koordinatlı Maltepe Merkez Konumu */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs">
          <iframe
            title="DietBox Merkez Mutfak Konumu"
            src="https://maps.google.com/maps?q=40.9515228,29.1286153&z=16&output=embed"
            className="w-full h-80 border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 bg-slate-50 border-t border-slate-100 text-xs">
            <div className="space-y-0.5">
              <strong className="text-slate-900 block">
                Mesa Tüketim Maddeleri Gıda İnşaat Enerji San. ve Ticaret Ltd. Şti.
              </strong>
              <span className="text-slate-600">
                Aydınevler Mah. Kırçiçeği Cd. 34854 Maltepe / İstanbul
              </span>
            </div>
            <a
              href="https://maps.app.goo.gl/SWfPdg6TxhcJ2LYK9"
              target="_blank"
              rel="noreferrer"
              className="bg-[#0d1f18] hover:bg-[#51a885] text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition"
            >
              <Navigation className="w-3.5 h-3.5 text-[#eab130]" />
              Google Haritalarda Yol Tarifi Al
            </a>
          </div>
        </div>
      </main>

      <SiteFooter generalSettings={settings} />
    </div>
  )
}