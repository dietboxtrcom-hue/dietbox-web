// src/components/SiteHeader.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PineappleIcon from '@/components/PineappleIcon'
import {
  ChevronDown,
  User,
  ShoppingBag,
  Menu,
  X,
  Phone,
  Clock,
} from 'lucide-react'

interface Props {
  menus: any[]
  generalSettings?: any
}

export default function SiteHeader({ menus, generalSettings }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [authUser, setAuthUser] = useState<any>(null)

  const topMenus = (menus || []).filter((m) => !m.parent_id && m.is_active)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setAuthUser(data.user)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null)
    })

    return () => {
      window.removeEventListener('scroll', onScroll)
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <>
      {/* İnce, Sakin Üst Şerit */}
      <div className="bg-[#0d1f18] text-white/80 text-[11px] py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-medium tracking-wide">
            <Clock className="w-3.5 h-3.5 text-[#eab130]" />
            <span>
              {generalSettings?.top_announcement ||
                'Sabah 06:00 - 09:30 arası soğuk zincir kapıya teslimat'}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 font-medium">
            {generalSettings?.phone && (
              <a
                href={`tel:${generalSettings.phone.replace(/\s+/g, '')}`}
                className="hover:text-white flex items-center gap-1.5 transition"
              >
                <Phone className="w-3 h-3 text-[#51a885]" />
                {generalSettings.phone}
              </a>
            )}
            <Link href="/hesabim" className="hover:text-[#eab130] transition">
              Paket Takibi & Dondurma
            </Link>
          </div>
        </div>
      </div>

      {/* Ana Minimalist & Premium Header */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-white/92 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.06)] border-b border-slate-200/70'
            : 'bg-white border-b border-slate-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-6">
          {/* Orijinal Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <img
              src="/images/logo/diet-box-logo.png"
              alt="DietBox"
              className="h-11 sm:h-12 w-auto object-contain"
            />
          </Link>

          {/* Ortalanmış Ferah Navigasyon */}
          <nav className="hidden lg:flex items-center gap-8 text-[13px] font-semibold tracking-wide text-slate-700">
            {topMenus.map((parent) => {
              const children = (menus || []).filter(
                (c) => c.parent_id === parent.id && c.is_active
              )

              if (children.length === 0) {
                return (
                  <Link
                    key={parent.id}
                    href={parent.url}
                    className="py-2 hover:text-[#51a885] transition-colors"
                  >
                    {parent.title}
                  </Link>
                )
              }

              return (
                <div key={parent.id} className="relative group py-6">
                  <Link
                    href={parent.url}
                    className="inline-flex items-center gap-1 hover:text-[#51a885] transition-colors"
                  >
                    {parent.title}
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#51a885] group-hover:rotate-180 transition-transform duration-200" />
                  </Link>

                  <div className="absolute left-0 top-full hidden group-hover:block w-68 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 p-2 z-50">
                    {children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.url}
                        className="block px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-[#51a885]/8 hover:text-[#51a885] transition"
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </nav>

          {/* Sağ Aksiyon Grubu: Sade, Dengeli ve Şık */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/#kalori-sihirbazi"
              className="hidden xl:inline-flex items-center gap-1.5 text-xs font-bold text-[#0d1f18] hover:text-[#51a885] px-3.5 py-2 rounded-full bg-slate-100/80 hover:bg-[#51a885]/10 transition"
            >
              <PineappleIcon className="w-4 h-4" />
              Paket Sihirbazı
            </Link>

            {authUser ? (
              <Link
                href="/hesabim"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 hover:border-[#51a885] bg-white transition"
              >
                {authUser.user_metadata?.avatar_url ? (
                  <img
                    src={authUser.user_metadata.avatar_url}
                    alt="Profil"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#51a885] text-white flex items-center justify-center text-xs font-bold">
                    {(authUser.user_metadata?.full_name || authUser.email || 'Ü')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-bold text-slate-800 max-w-[110px] truncate">
                  {authUser.user_metadata?.full_name || 'Hesabım'}
                </span>
              </Link>
            ) : (
              <Link
                href="/giris"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-slate-700 hover:text-[#0d1f18] border border-slate-200 hover:border-slate-400 transition"
              >
                <User className="w-3.5 h-3.5" />
                <span>Giriş Yap</span>
              </Link>
            )}

            <Link
              href="/odeme"
              className="inline-flex items-center gap-2 bg-[#0d1f18] hover:bg-[#51a885] text-white px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold transition shadow-sm"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#eab130]" />
              <span className="hidden sm:inline">Sepetim</span>
            </Link>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-full border border-slate-200 text-slate-700"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobil Menü */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 px-5 py-5 space-y-3 shadow-xl">
            {topMenus.map((parent) => {
              const children = (menus || []).filter(
                (c) => c.parent_id === parent.id && c.is_active
              )
              return (
                <div key={parent.id} className="space-y-1">
                  <Link
                    href={parent.url}
                    onClick={() => setMobileOpen(false)}
                    className="block font-bold text-sm text-slate-900 py-1.5"
                  >
                    {parent.title}
                  </Link>
                  {children.map((ch) => (
                    <Link
                      key={ch.id}
                      href={ch.url}
                      onClick={() => setMobileOpen(false)}
                      className="block pl-4 text-xs text-slate-500 py-1"
                    >
                      {ch.title}
                    </Link>
                  ))}
                </div>
              )
            })}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <Link
                href="/#kalori-sihirbazi"
                onClick={() => setMobileOpen(false)}
                className="bg-slate-100 text-slate-900 font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5"
              >
                <PineappleIcon className="w-3.5 h-3.5" />
                Paket Sihirbazı
              </Link>
              <Link
                href={authUser ? '/hesabim' : '/giris'}
                onClick={() => setMobileOpen(false)}
                className="bg-[#0d1f18] text-white font-bold text-xs py-3 rounded-xl text-center"
              >
                {authUser ? 'Profilim' : 'Google ile Giriş'}
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  )
}