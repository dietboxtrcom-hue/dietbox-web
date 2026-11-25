// src/app/iletisim/page.tsx
'use client'

import { useState, useEffect } from 'react'
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <SiteHeader menus={menus} generalSettings={settings} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          ANASAYFA &gt; <span className="text-slate-800">İLETİŞİM & KURUMSAL BİLGİLER</span>
        </div>

        {/* Görsel 4'teki 2 Sütunlu İletişim Bilgileri & İletişim Formu */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sol: İletişim Bilgileri */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">İletişim Bilgileri</h1>
              <p className="text-sm text-slate-500 mt-0.5">Bize Ulaşın.</p>
            </div>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Adres</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    {settings?.address ||
                      'Aydınevler Mah. Kırçiçeği Cad. No:28/A Maltepe / İstanbul'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Canlı Destek</h3>
                  <a
                    href={`tel:${(settings?.phone || '02163672413').replace(/\s+/g, '')}`}
                    className="text-xs sm:text-sm text-emerald-700 font-bold hover:underline mt-0.5 block"
                  >
                    {settings?.phone || '0 216 367 24 13'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">E-posta Destek</h3>
                  <a
                    href={`mailto:${settings?.email || 'info@dietboxtr.com'}`}
                    className="text-xs sm:text-sm text-slate-600 hover:text-emerald-600 mt-0.5 block"
                  >
                    {settings?.email || 'info@dietboxtr.com'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Whatsapp Destek</h3>
                  <a
                    href={`https://wa.me/${(settings?.whatsapp || '905421482021').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs sm:text-sm text-emerald-700 font-bold hover:underline mt-0.5 block"
                  >
                    {settings?.whatsapp_display || '0 542 148 20 21'}
                  </a>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed pt-4 border-t border-slate-100">
              Yukarıdaki iletişim yollarını kullanarak bize dilediğiniz zaman ulaşabilirsiniz. Aklınıza takılan her türlü konuda size destek vermekten mutluluk duyarız.
            </p>
          </div>

          {/* Sağ: İletişim Formu */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">İletişim Formu</h2>
              <p className="text-sm text-slate-500 mt-0.5">Bize Mesaj Gönderin.</p>
            </div>

            {sent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-emerald-600"
                />
                <input
                  type="email"
                  required
                  placeholder="E-mail Adresiniz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-emerald-600"
                />
                <input
                  type="tel"
                  required
                  placeholder="Telefon Numaranız"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-emerald-600"
                />
                <textarea
                  rows={4}
                  required
                  placeholder="Mesajınız (Kalori hedefiniz, alerjen durumunuz veya teslimat bölgeniz hakkında sorabilirsiniz)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-emerald-600"
                />

                <label className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kvkkAccepted}
                    onChange={(e) => setKvkkAccepted(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span>
                    Bu formu doldurarak <strong className="text-emerald-700">KVKK</strong> koşullarını kabul ettiğimi beyan ederim.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm px-8 py-3.5 rounded-xl transition flex items-center gap-2 cursor-pointer"
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
            <Clock className="w-6 h-6 text-emerald-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">Sabah 06:00 - 09:30 Teslimat</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tüm paketlerimiz gece üretilip soğuk zincir araçlarımızla sabah 06:00 - 09:30 saatleri arasında ev veya iş yeri adresinize teslim edilir.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
            <Truck className="w-6 h-6 text-emerald-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">Cumartesi Çift Paket Sistemi</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pazar günü kurye dağıtımı yapılmamakta olup, &ldquo;Her Gün&rdquo; aboneliği seçen müşterilerimize Cumartesi sabahı hem Cumartesi hem Pazar paketi (farklı menülerle) teslim edilir.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">Esnek Paket Dondurma</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Acil seyahat veya tatil durumlarında teslimatınızı Müşteri Panelinizden dondurabilir, dondurduğunuz günlerin paket sonuna eklenmesini sağlayabilirsiniz.
            </p>
          </div>
        </section>

        {/* Google Harita (Aydınevler Mah. Kırçiçeği Cad. No:28/A Maltepe / İstanbul) */}
        <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-sm overflow-hidden">
          <iframe
            title="DietBox Maltepe Merkez Konumu"
            src="https://www.google.com/maps?q=Ayd%C4%B1nevler%20Mah.%20K%C4%B1r%C3%A7i%C3%A7e%C4%9Fi%20Cad.%20No:28/A%20Maltepe%20%C4%B0stanbul&output=embed"
            className="w-full h-80 rounded-2xl border-0"
            loading="lazy"
          />
        </div>
      </main>

      <SiteFooter generalSettings={settings} />
    </div>
  )
}