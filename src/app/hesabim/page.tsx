// src/app/hesabim/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, isAfter, parseISO, startOfDay } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { formatTRY } from '@/lib/pricing-engine'
import {
  getFreezeEligibility,
  getAddressChangeEligibility,
  getIstanbulNow,
} from '@/lib/calendar-engine'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import WeightProgressTracker from '@/components/WeightProgressTracker'
import {
  User,
  MapPin,
  Flame,
  Package,
  Snowflake,
  Save,
  LogOut,
  Search,
  CheckCircle2,
  CalendarCheck,
  Activity,
  FileText,
  ArrowRight,
  Clock,
  Edit3,
  X,
} from 'lucide-react'

export default function CustomerAccountPage() {
  const router = useRouter()
  const [menus, setMenus] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [authUser, setAuthUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile')

  // Lojistik Lokasyon Listeleri
  const [cities, setCities] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [neighborhoods, setNeighborhoods] = useState<any[]>([])

  const [profile, setProfile] = useState<any>({
    full_name: '',
    email: '',
    phone: '',
    tc_no: '',
    invoice_type: 'individual',
    company_name: '',
    tax_office: '',
    tax_no: '',
    city: 'İstanbul',
    city_id: 1,
    district: '',
    district_id: '',
    neighborhood: '',
    neighborhood_id: '',
    full_address: '',
    height_cm: '',
    weight_kg: '',
    target_weight_kg: '',
    age: '',
    gender: 'male',
    allergies: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  const [orders, setOrders] = useState<any[]>([])
  const [guestSearch, setGuestSearch] = useState('')
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [freezingId, setFreezingId] = useState<string | null>(null)

  // Sipariş Adres Değişikliği Modal State'i
  const [addressModalOrder, setAddressModalOrder] = useState<any | null>(null)
  const [addrDistrictId, setAddrDistrictId] = useState<string>('')
  const [addrNeighborhoodId, setAddrNeighborhoodId] = useState<string>('')
  const [addrFullText, setAddrFullText] = useState<string>('')
  const [savingAddress, setSavingAddress] = useState(false)

  const fetchOrdersFromApi = async (params: {
    userId?: string
    email?: string
    phone?: string
    searchQuery?: string
  }) => {
    setLoadingOrders(true)
    try {
      const res = await fetch('/api/account/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (res.ok) {
        setOrders(data.orders || [])
      }
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const [mRes, sRes, uRes, cRes, dRes, nRes] = await Promise.all([
        supabase.from('navigation_menus').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('system_settings').select('value').eq('key', 'general_settings').single(),
        supabase.auth.getUser(),
        supabase.from('cities').select('*').eq('is_active', true).order('id'),
        supabase.from('districts').select('*').eq('is_active', true).order('name'),
        supabase.from('neighborhoods').select('*').eq('is_active', true).order('name').limit(2000),
      ])

      const loadedCities = cRes.data || []
      const loadedDistricts = dRes.data || []
      const loadedNeighborhoods = nRes.data || []

      setMenus(mRes.data || [])
      if (sRes.data?.value) setSettings(sRes.data.value)
      setCities(loadedCities)
      setDistricts(loadedDistricts)
      setNeighborhoods(loadedNeighborhoods)

      if (uRes.data?.user) {
        const u = uRes.data.user
        setAuthUser(u)

        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', u.id)
          .single()

        const matchedCity =
          loadedCities.find((c) => c.id === prof?.city_id) ||
          loadedCities.find((c) => c.name?.toLowerCase() === (prof?.city || 'istanbul').toLowerCase()) ||
          loadedCities[0]

        const matchedDistrict =
          loadedDistricts.find((d) => d.id === prof?.district_id) ||
          loadedDistricts.find(
            (d) =>
              prof?.district &&
              d.name?.toLowerCase() === String(prof.district).trim().toLowerCase()
          )

        const matchedNeighborhood =
          loadedNeighborhoods.find((n) => n.id === prof?.neighborhood_id) ||
          loadedNeighborhoods.find(
            (n) =>
              prof?.neighborhood &&
              (!matchedDistrict || n.district_id === matchedDistrict.id) &&
              n.name?.toLowerCase() === String(prof.neighborhood).trim().toLowerCase()
          )

        const merged = {
          full_name: prof?.full_name || u.user_metadata?.full_name || u.user_metadata?.name || '',
          email: prof?.email || u.email || '',
          phone: prof?.phone || u.user_metadata?.phone || '',
          tc_no: prof?.tc_no || '',
          invoice_type: prof?.invoice_type || 'individual',
          company_name: prof?.company_name || '',
          tax_office: prof?.tax_office || '',
          tax_no: prof?.tax_no || '',
          city: matchedCity?.name || prof?.city || 'İstanbul',
          city_id: matchedCity?.id || prof?.city_id || 1,
          district: matchedDistrict?.name || prof?.district || '',
          district_id: matchedDistrict?.id ? String(matchedDistrict.id) : '',
          neighborhood: matchedNeighborhood?.name || prof?.neighborhood || '',
          neighborhood_id: matchedNeighborhood?.id ? String(matchedNeighborhood.id) : '',
          full_address: prof?.full_address || '',
          height_cm: prof?.height_cm || '',
          weight_kg: prof?.weight_kg || '',
          target_weight_kg: prof?.target_weight_kg || '',
          age: prof?.age || '',
          gender: prof?.gender || 'male',
          allergies: prof?.allergies || '',
        }
        setProfile(merged)

        fetchOrdersFromApi({
          userId: u.id,
          email: merged.email,
          phone: merged.phone,
        })
      }
    }
    init()
  }, [])

  const availableDistricts = useMemo(() => {
    if (!profile.city_id) return districts
    return districts.filter((d) => Number(d.city_id) === Number(profile.city_id))
  }, [districts, profile.city_id])

  const availableNeighborhoods = useMemo(() => {
    if (!profile.district_id) return []
    return neighborhoods.filter((n) => Number(n.district_id) === Number(profile.district_id))
  }, [neighborhoods, profile.district_id])

  const modalNeighborhoods = useMemo(() => {
    if (!addrDistrictId) return []
    return neighborhoods.filter((n) => Number(n.district_id) === Number(addrDistrictId))
  }, [neighborhoods, addrDistrictId])

  const healthMetrics = useMemo(() => {
    const h = Number(profile.height_cm)
    const w = Number(profile.weight_kg)
    const a = Number(profile.age) || 30
    if (!h || !w || h < 100 || w < 30) return null

    const hMeters = h / 100
    const bmi = Number((w / (hMeters * hMeters)).toFixed(1))

    const bmr = Math.round(
      profile.gender === 'male'
        ? 10 * w + 6.25 * h - 5 * a + 5
        : 10 * w + 6.25 * h - 5 * a - 161
    )
    const maintenanceCalories = Math.round(bmr * 1.35)
    const targetCalories = Math.max(1150, maintenanceCalories - 400)

    const idealMin = Math.round(18.5 * hMeters * hMeters)
    const idealMax = Math.round(24.9 * hMeters * hMeters)

    let bmiLabel = 'İdeal Kilo'
    let bmiColor = 'text-emerald-700 bg-emerald-100'
    if (bmi < 18.5) {
      bmiLabel = 'Zayıf'
      bmiColor = 'text-blue-700 bg-blue-100'
    } else if (bmi >= 25 && bmi < 30) {
      bmiLabel = 'Fazla Kilolu'
      bmiColor = 'text-amber-800 bg-amber-100'
    } else if (bmi >= 30) {
      bmiLabel = 'Obezite Sınırı'
      bmiColor = 'text-red-700 bg-red-100'
    }

    const barPercent = Math.min(100, Math.max(4, ((bmi - 15) / (38 - 15)) * 100))

    return {
      bmi,
      bmiLabel,
      bmiColor,
      barPercent,
      bmr,
      maintenanceCalories,
      targetCalories,
      idealMin,
      idealMax,
    }
  }, [profile.height_cm, profile.weight_kg, profile.age, profile.gender])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authUser) return
    setSavingProfile(true)
    const supabase = createClient()

    const { error } = await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        tc_no: profile.tc_no,
        invoice_type: profile.invoice_type,
        company_name: profile.company_name,
        tax_office: profile.tax_office,
        tax_no: profile.tax_no,
        city: profile.city,
        city_id: profile.city_id ? Number(profile.city_id) : null,
        district: profile.district,
        district_id: profile.district_id ? Number(profile.district_id) : null,
        neighborhood: profile.neighborhood,
        neighborhood_id: profile.neighborhood_id ? Number(profile.neighborhood_id) : null,
        full_address: profile.full_address,
        height_cm: profile.height_cm ? Number(profile.height_cm) : null,
        weight_kg: profile.weight_kg ? Number(profile.weight_kg) : null,
        target_weight_kg: profile.target_weight_kg ? Number(profile.target_weight_kg) : null,
        age: profile.age ? Number(profile.age) : null,
        gender: profile.gender,
        daily_calorie_target: healthMetrics?.targetCalories || null,
        allergies: profile.allergies,
      },
      { onConflict: 'id' }
    )
    setSavingProfile(false)

    if (error) {
      alert(error.message)
    } else {
      alert(
        'Profil, mahalle, fatura ve beslenme bilgileriniz kaydedildi! Sipariş ekranında otomatik doldurulacaktır.'
      )
      fetchOrdersFromApi({
        userId: authUser.id,
        email: profile.email,
        phone: profile.phone,
      })
    }
  }

  const handleFreezeDelivery = async (deliveryId: string, orderId: string, dateStr: string) => {
    const check = getFreezeEligibility(dateStr)
    if (!check.canFreeze) {
      alert(check.reason)
      return
    }

    if (!confirm(`${dateStr} tarihli teslimatı dondurup paket sonuna +1 gün eklemek istiyor musunuz?`))
      return
    setFreezingId(deliveryId)
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'freeze_delivery_day',
        payload: { deliveryId, orderId },
      }),
    })
    const data = await res.json()
    setFreezingId(null)
    if (res.ok) {
      alert(`Gün donduruldu! Yeni paket bitiş tarihiniz: ${data.newEndDate}`)
      if (guestSearch) {
        fetchOrdersFromApi({ searchQuery: guestSearch })
      } else if (authUser) {
        fetchOrdersFromApi({ userId: authUser.id, email: profile.email, phone: profile.phone })
      }
    } else {
      alert(data.error || 'İşlem yapılamadı.')
    }
  }

  const openAddressModal = (order: any, nextDeliveryDate: string) => {
    const check = getAddressChangeEligibility(nextDeliveryDate)
    if (!check.canChange) {
      alert(check.reason)
      return
    }

    const dMatch = districts.find(
      (d) => d.name?.toLowerCase() === String(order.district_name || '').trim().toLowerCase()
    )
    const nMatch =
      neighborhoods.find((n) => order.neighborhood_id && n.id === order.neighborhood_id) ||
      neighborhoods.find(
        (n) =>
          (!dMatch || n.district_id === dMatch.id) &&
          n.name?.toLowerCase() === String(order.neighborhood_name || '').trim().toLowerCase()
      )

    setAddrDistrictId(dMatch ? String(dMatch.id) : districts[0] ? String(districts[0].id) : '')
    setAddrNeighborhoodId(nMatch ? String(nMatch.id) : '')
    setAddrFullText(order.full_address || '')
    setAddressModalOrder({ ...order, _nextDeliveryDate: nextDeliveryDate })
  }

  const handleSaveOrderAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addressModalOrder) return

    const dObj = districts.find((d) => String(d.id) === addrDistrictId)
    const nObj = modalNeighborhoods.find((n) => String(n.id) === addrNeighborhoodId)

    if (!dObj || !nObj || !addrFullText.trim()) {
      alert('Lütfen ilçe, mahalle ve açık adres bilgilerini eksiksiz doldurun.')
      return
    }

    setSavingAddress(true)
    try {
      const res = await fetch('/api/account/update-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: addressModalOrder.id,
          districtName: dObj.name,
          neighborhoodId: nObj.id,
          neighborhoodName: nObj.name,
          fullAddress: addrFullText.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Adres güncellenemedi.')
        return
      }
      alert(
        `Teslimat adresiniz güncellendi! ${format(
          parseISO(data.nextDeliveryDate),
          'dd.MM.yyyy'
        )} tarihli teslimattan itibaren yeni adresinize gönderim yapılacaktır.`
      )
      setAddressModalOrder(null)
      if (guestSearch) {
        fetchOrdersFromApi({ searchQuery: guestSearch })
      } else if (authUser) {
        fetchOrdersFromApi({ userId: authUser.id, email: profile.email, phone: profile.phone })
      }
    } finally {
      setSavingAddress(false)
    }
  }

  const today = startOfDay(new Date())
  const todayIstanbulStr = format(getIstanbulNow().istanbulDayStart, 'yyyy-MM-dd')

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-between">
      <SiteHeader menus={menus} generalSettings={settings} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Üst Profil Özet Bandı */}
        {authUser ? (
          <div className="bg-[#0d1f18] text-white rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#51a885] flex items-center justify-center text-2xl font-black">
                {(profile.full_name || 'Ü')[0].toUpperCase()}
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#eab130]">
                  DietBox Üye Profili
                </span>
                <h1 className="text-2xl font-black">{profile.full_name || 'Hoş Geldiniz'}</h1>
                <p className="text-xs text-white/70">{profile.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {healthMetrics && (
                <div className="bg-white/10 border border-white/15 rounded-2xl px-4 py-2.5 flex items-center gap-4 text-xs">
                  <div>
                    <span className="block text-white/60 text-[10px]">VKİ (Vücut Kitle Endeksi)</span>
                    <strong className="text-base font-black text-white">
                      {healthMetrics.bmi} ({healthMetrics.bmiLabel})
                    </strong>
                  </div>
                  <div className="h-7 w-[1px] bg-white/15" />
                  <div>
                    <span className="block text-white/60 text-[10px]">Günlük Kalori Hedefi</span>
                    <strong className="text-base font-black text-[#eab130]">
                      ~{healthMetrics.targetCalories} kcal
                    </strong>
                  </div>
                </div>
              )}

              <button
                onClick={async () => {
                  const supabase = createClient()
                  await supabase.auth.signOut()
                  setAuthUser(null)
                  router.push('/')
                }}
                className="bg-white/10 hover:bg-red-600/80 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Çıkış Yap
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-900">Hesabım &amp; Sipariş Takibi</h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Üye girişi yaparak adres, fatura, kilo gelişim grafiği ve siparişlerinizi takip edebilirsiniz.
              </p>
            </div>
            <Link
              href="/giris"
              className="bg-[#51a885] hover:bg-[#3f8d6d] text-white font-bold px-6 py-3.5 rounded-full text-sm transition"
            >
              Üye Girişi / Kayıt Ol
            </Link>
          </div>
        )}

        {/* Sekmeler */}
        {authUser && (
          <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition ${
                activeTab === 'profile'
                  ? 'bg-[#0d1f18] text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <User className="w-4 h-4" />
              Profil, Gelişim Grafiği &amp; VKİ
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition ${
                activeTab === 'orders'
                  ? 'bg-[#0d1f18] text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Package className="w-4 h-4" />
              Siparişlerim, Adres &amp; Gün Dondurma ({orders.length})
            </button>
          </div>
        )}

        {/* SEKME 1: PROFİL, FATURA, VKİ VE KİLO GELİŞİM GRAFİĞİ */}
        {authUser && activeTab === 'profile' && (
          <div className="space-y-8">
            <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* SOL: Kişisel, Adres ve Fatura Bilgileri */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-5">
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#51a885]" />
                    Kişisel &amp; Teslimat Adresi Bilgileri
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Ad Soyad</label>
                      <input
                        type="text"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        E-Posta Adresi
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3.5 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Telefon</label>
                      <input
                        type="tel"
                        placeholder="05XX XXX XX XX"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        T.C. Kimlik Numarası (Fatura İçin)
                      </label>
                      <input
                        type="text"
                        maxLength={11}
                        placeholder="11 Haneli T.C. Kimlik No"
                        value={profile.tc_no}
                        onChange={(e) => setProfile({ ...profile, tc_no: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                      />
                    </div>

                    {cities.length > 1 && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 mb-1">İl</label>
                        <select
                          value={profile.city_id}
                          onChange={(e) => {
                            const cid = Number(e.target.value)
                            const cObj = cities.find((c) => c.id === cid)
                            setProfile({
                              ...profile,
                              city_id: cid,
                              city: cObj?.name || 'İstanbul',
                              district_id: '',
                              district: '',
                              neighborhood_id: '',
                              neighborhood: '',
                            })
                          }}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white"
                        >
                          {cities.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">İlçe</label>
                      <select
                        value={profile.district_id}
                        onChange={(e) => {
                          const did = e.target.value
                          const dObj = availableDistricts.find((d) => String(d.id) === did)
                          setProfile({
                            ...profile,
                            district_id: did,
                            district: dObj?.name || '',
                            neighborhood_id: '',
                            neighborhood: '',
                          })
                        }}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white"
                      >
                        <option value="">İlçe Seçiniz...</option>
                        {availableDistricts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.side})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Mahalle</label>
                      <select
                        value={profile.neighborhood_id}
                        disabled={!profile.district_id}
                        onChange={(e) => {
                          const nid = e.target.value
                          const nObj = availableNeighborhoods.find((n) => String(n.id) === nid)
                          setProfile({
                            ...profile,
                            neighborhood_id: nid,
                            neighborhood: nObj?.name || '',
                          })
                        }}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <option value="">
                          {profile.district_id ? 'Mahalle Seçiniz...' : 'Önce İlçe Seçin'}
                        </option>
                        {availableNeighborhoods.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Açık Teslimat Adresi
                      </label>
                      <textarea
                        rows={2}
                        value={profile.full_address}
                        onChange={(e) => setProfile({ ...profile, full_address: e.target.value })}
                        placeholder="Cadde, sokak, bina ve daire bilgileriniz..."
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Fatura Tercihi */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-4">
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#51a885]" />
                    Varsayılan Fatura Bilgileri
                  </h2>
                  <select
                    value={profile.invoice_type}
                    onChange={(e) => setProfile({ ...profile, invoice_type: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                  >
                    <option value="individual">Bireysel Fatura (T.C. Kimlik ile)</option>
                    <option value="corporate">Kurumsal Fatura (Şirket Adına)</option>
                  </select>

                  {profile.invoice_type === 'corporate' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Firma Ünvanı"
                        value={profile.company_name}
                        onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                        className="border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Vergi Dairesi"
                        value={profile.tax_office}
                        onChange={(e) => setProfile({ ...profile, tax_office: e.target.value })}
                        className="border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Vergi Numarası"
                        value={profile.tax_no}
                        onChange={(e) => setProfile({ ...profile, tax_no: e.target.value })}
                        className="border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* SAĞ: VKİ & Kalori Hesaplama Paneli */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-5 h-fit">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#eab130]" />
                  VKİ &amp; Kalori Hesaplama Profili
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Boy (cm)</label>
                    <input
                      type="number"
                      placeholder="177"
                      value={profile.height_cm}
                      onChange={(e) => setProfile({ ...profile, height_cm: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Kilo (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="75"
                      value={profile.weight_kg}
                      onChange={(e) => setProfile({ ...profile, weight_kg: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Yaş</label>
                    <input
                      type="number"
                      placeholder="42"
                      value={profile.age}
                      onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Cinsiyet</label>
                    <select
                      value={profile.gender}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                    >
                      <option value="female">Kadın</option>
                      <option value="male">Erkek</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Alerjenler / Beslenme Notları
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Örn: Laktoz hassasiyeti, ceviz alerjisi..."
                    value={profile.allergies}
                    onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>

                {healthMetrics && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 block">
                          Vücut Kitle Endeksi (VKİ)
                        </span>
                        <span className="text-2xl font-black text-slate-900">
                          {healthMetrics.bmi}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-extrabold px-3 py-1.5 rounded-full ${healthMetrics.bmiColor}`}
                      >
                        {healthMetrics.bmiLabel}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="relative h-3 rounded-full overflow-hidden flex">
                        <div className="w-[20%] bg-blue-400" />
                        <div className="w-[30%] bg-emerald-500" />
                        <div className="w-[25%] bg-amber-400" />
                        <div className="w-[25%] bg-red-500" />
                        <div
                          className="absolute top-0 bottom-0 w-1.5 bg-slate-950 rounded-full shadow"
                          style={{ left: `calc(${healthMetrics.barPercent}% - 3px)` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Zayıf (&lt;18.5)</span>
                        <span>İdeal (18.5-24.9)</span>
                        <span>Fazla (25-29.9)</span>
                        <span>Obez (30+)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Bazal Metabolizma</span>
                        <strong className="text-slate-900">{healthMetrics.bmr} kcal/gün</strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">İdeal Kilo Aralığınız</span>
                        <strong className="text-slate-900">
                          {healthMetrics.idealMin} - {healthMetrics.idealMax} kg
                        </strong>
                      </div>
                    </div>

                    <div className="bg-[#51a885]/12 border border-[#51a885]/30 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-[#51a885]" />
                        <div>
                          <span className="text-[10px] font-bold text-slate-600 block">
                            Zayıflama İçin Günlük Hedef
                          </span>
                          <strong className="text-base font-black text-[#0d1f18]">
                            ~{healthMetrics.targetCalories} kcal
                          </strong>
                        </div>
                      </div>
                      <Link
                        href="/paketler"
                        className="text-xs font-extrabold text-[#51a885] hover:underline flex items-center gap-1"
                      >
                        Paket Seç <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full bg-[#51a885] hover:bg-[#3f8d6d] text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {savingProfile ? 'Kaydediliyor...' : 'Tüm Bilgilerimi Kaydet'}
                </button>
              </div>
            </form>

            {/* KİLO & FORM GELİŞİM GRAFİĞİ */}
            <WeightProgressTracker
              userId={authUser.id}
              currentWeight={profile.weight_kg ? Number(profile.weight_kg) : null}
              targetWeight={profile.target_weight_kg ? Number(profile.target_weight_kg) : null}
              onWeightUpdated={(newWeight) =>
                setProfile((prev: any) => ({ ...prev, weight_kg: String(newWeight) }))
              }
            />
          </div>
        )}

        {/* SEKME 2: SİPARİŞLERİM, ADRES DEĞİŞİKLİĞİ & MİSAFİR SORGULAMA */}
        {(!authUser || activeTab === 'orders') && (
          <div className="space-y-6">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                fetchOrdersFromApi({ searchQuery: guestSearch })
              }}
              className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                placeholder="Farklı bir sipariş no (DB-...) veya telefon ile sorgula..."
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              />
              <button
                type="submit"
                className="bg-[#0d1f18] text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                {loadingOrders ? 'Aranıyor...' : 'Sipariş Sorgula'}
              </button>
            </form>

            {/* Dondurma ve Adres Değişikliği Kuralları Bilgi Bandı */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-blue-50/80 border border-blue-200 rounded-2xl px-4 py-3 text-xs text-blue-950 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Gün Dondurma Kuralı:</strong> Teslimat gününden en geç{' '}
                  <strong>1 gün önce saat 12:00&apos;ye kadar</strong> tek tıkla gününüzü dondurabilirsiniz.
                </span>
              </div>
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-950 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Adres Değişikliği Kuralı:</strong> Normal günler için{' '}
                  <strong>1 gün önce 14:00</strong>, Pazar teslimatı için{' '}
                  <strong>Cuma 14:00</strong>, Pazartesi teslimatı için{' '}
                  <strong>Cumartesi 12:00</strong>&apos;ye kadar adresinizi güncelleyebilirsiniz.
                </span>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500">
                  Henüz bu hesaba bağlı bir sipariş bulunamadı. Yukarıdaki kutudan Sipariş No ile de sorgulayabilirsiniz.
                </p>
                <Link
                  href="/paketler"
                  className="inline-block bg-[#51a885] text-white font-bold text-xs px-5 py-2.5 rounded-full"
                >
                  Paketleri İncele
                </Link>
              </div>
            ) : (
              orders.map((order) => {
                const deliveries = [...(order.order_deliveries || [])].sort((a, b) =>
                  a.delivery_date.localeCompare(b.delivery_date)
                )
                const nextScheduled = deliveries.find(
                  (d) => d.status === 'scheduled' && d.delivery_date > todayIstanbulStr
                )
                const addrEligibility = nextScheduled
                  ? getAddressChangeEligibility(nextScheduled.delivery_date)
                  : null

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl p-6 border border-slate-200 space-y-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-[#0d1f18] text-white text-xs font-bold px-2.5 py-1 rounded-md">
                            {order.order_number}
                          </span>
                          <h3 className="font-extrabold text-slate-900">
                            {order.package_title} ({order.duration_days} Gün)
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#51a885] shrink-0" />
                          <span>
                            {order.district_name} / {order.neighborhood_name} — {order.full_address}
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2">
                        <div className="text-left sm:text-right">
                          <span className="text-xs text-slate-400 block">Toplam Tutar</span>
                          <strong className="text-lg font-black text-[#51a885]">
                            {formatTRY(order.grand_total)}
                          </strong>
                        </div>

                        {nextScheduled && addrEligibility && (
                          <button
                            type="button"
                            onClick={() => openAddressModal(order, nextScheduled.delivery_date)}
                            title={addrEligibility.reason}
                            className={`text-xs font-bold px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition ${
                              addrEligibility.canChange
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            {addrEligibility.canChange
                              ? 'Teslimat Adresini Değiştir'
                              : 'Adres Değişikliği Süresi Doldu'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <CalendarCheck className="w-4 h-4 text-[#51a885]" />
                        Başlangıç: <strong>{order.start_date}</strong>
                      </span>
                      <span>
                        Bitiş:{' '}
                        <strong className="text-[#51a885]">{order.estimated_end_date}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                      {deliveries.map((del) => {
                        const freezeCheck = getFreezeEligibility(del.delivery_date)
                        const isScheduled = del.status === 'scheduled'
                        const isFutureButLocked =
                          isScheduled &&
                          !freezeCheck.canFreeze &&
                          isAfter(parseISO(del.delivery_date), today)

                        return (
                          <div
                            key={del.id}
                            className={`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-2 ${
                              del.status === 'frozen'
                                ? 'bg-blue-50 border-blue-200 text-blue-800'
                                : del.status === 'delivered'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : isFutureButLocked
                                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div>
                              <strong className="block">
                                {format(parseISO(del.delivery_date), 'dd.MM.yyyy')}
                              </strong>
                              <span className="text-[11px] opacity-80">
                                {del.package_quantity} Paket
                              </span>
                            </div>

                            {del.status === 'frozen' && (
                              <span className="text-[10px] font-bold text-blue-700 flex items-center gap-1">
                                <Snowflake className="w-3 h-3" /> Donduruldu
                              </span>
                            )}

                            {del.status === 'delivered' && (
                              <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Teslim Edildi
                              </span>
                            )}

                            {isScheduled && freezeCheck.canFreeze && (
                              <button
                                type="button"
                                disabled={freezingId === del.id}
                                title={freezeCheck.reason}
                                onClick={() =>
                                  handleFreezeDelivery(del.id, order.id, del.delivery_date)
                                }
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded-lg text-[11px] cursor-pointer transition"
                              >
                                {freezingId === del.id ? '...' : 'Günü Dondur'}
                              </button>
                            )}

                            {isFutureButLocked && (
                              <button
                                type="button"
                                onClick={() => alert(freezeCheck.reason)}
                                title={freezeCheck.reason}
                                className="w-full bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold py-1.5 px-2 rounded-lg text-[10px] cursor-pointer transition"
                              >
                                Süre Doldu (12:00)
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </main>

      {/* SİPARİŞ ADRES DEĞİŞİKLİĞİ MODALI */}
      {addressModalOrder && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveOrderAddress}
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Teslimat Adresini Değiştir
                </h3>
                <p className="text-xs text-slate-500">
                  Sipariş: <strong>{addressModalOrder.order_number}</strong> • Geçerlilik:{' '}
                  <strong>
                    {format(parseISO(addressModalOrder._nextDeliveryDate), 'dd.MM.yyyy')}
                  </strong>{' '}
                  ve sonrası
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddressModalOrder(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">İlçe *</label>
                <select
                  required
                  value={addrDistrictId}
                  onChange={(e) => {
                    const nextDistId = e.target.value
                    setAddrDistrictId(nextDistId)
                    const firstN = neighborhoods.find(
                      (n) => String(n.district_id) === nextDistId
                    )
                    setAddrNeighborhoodId(firstN ? String(firstN.id) : '')
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                >
                  <option value="">İlçe Seçiniz...</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.side})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mahalle *</label>
                <select
                  required
                  value={addrNeighborhoodId}
                  disabled={!addrDistrictId}
                  onChange={(e) => setAddrNeighborhoodId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white disabled:bg-slate-50"
                >
                  <option value="">Mahalle Seçiniz...</option>
                  {modalNeighborhoods.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Yeni Açık Adres *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Cadde, sokak, bina, daire ve kurye notu..."
                value={addrFullText}
                onChange={(e) => setAddrFullText(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddressModalOrder(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={savingAddress}
                className="bg-[#51a885] hover:bg-[#3f8d6d] disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer transition"
              >
                <Save className="w-4 h-4" />
                {savingAddress ? 'Güncelleniyor...' : 'Yeni Adresi Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      <SiteFooter generalSettings={settings} />
    </div>
  )
}