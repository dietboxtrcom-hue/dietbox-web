// src/app/giris/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { User, Phone, Mail, Lock, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function CustomerAuthPage() {
  const router = useRouter()
  const [menus, setMenus] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [mode, setMode] = useState<'login' | 'register'>('login')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) router.replace('/hesabim')
    })

    Promise.all([
      supabase.from('navigation_menus').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('system_settings').select('value').eq('key', 'general_settings').single(),
    ]).then(([mRes, sRes]) => {
      setMenus(mRes.data || [])
      if (sRes.data?.value) setSettings(sRes.data.value)
    })
  }, [router])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccessMsg('')
    const supabase = createClient()

    if (mode === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone },
        },
      })

      if (error) {
        setLoading(false)
        return alert(error.message)
      }

      // Profil tablosuna temel bilgileri kaydet
      if (data?.user) {
        await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            full_name: fullName,
            email,
            phone,
          },
          { onConflict: 'id' }
        )
      }

      // Gmail SMTP üzerinden müşteriye + admine çift taraflı hoş geldiniz maili gönder
      await fetch('/api/mail/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone }),
      })

      setLoading(false)
      setSuccessMsg(
        'Üyeliğiniz oluşturuldu ve bilgilendirme e-postası gönderildi! Şimdi giriş yaparak profilinizi ve siparişlerinizi yönetebilirsiniz.'
      )
      setMode('login')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) return alert('E-posta veya şifre hatalı.')
      router.push('/hesabim')
    }
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-between">
      <SiteHeader menus={menus} generalSettings={settings} />

      <main className="max-w-md w-full mx-auto px-4 py-14">
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.05)] space-y-6">
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Üye Girişi
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Yeni Üyelik
            </button>
          </div>

          {successMsg && (
            <div className="bg-[#51a885]/10 border border-[#51a885]/30 text-[#0d1f18] p-4 rounded-2xl text-xs font-semibold flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#51a885] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Adınız Soyadınız"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm"
                  />
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    placeholder="Telefon Numaranız (05XX...)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                placeholder="E-posta adresiniz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm"
              />
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Şifreniz (En az 6 karakter)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#51a885] hover:bg-[#3f8d6d] text-white font-extrabold py-3.5 rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {loading
                  ? 'İşleniyor...'
                  : mode === 'login'
                  ? 'Giriş Yap'
                  : 'Üyeliğimi Oluştur'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <Link href="/hesabim" className="text-xs font-bold text-[#51a885] hover:underline">
              Üye Olmadan Sipariş No / Telefon ile Paket Takibi &rarr;
            </Link>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-[#51a885]" />
            <span>Tüm sipariş ve dondurma bildirimleri e-posta adresinize iletilir.</span>
          </div>
        </div>
      </main>

      <SiteFooter generalSettings={settings} />
    </div>
  )
}