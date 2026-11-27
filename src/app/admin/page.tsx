// src/app/admin/page.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'
import { getFreezeEligibility, getIstanbulNow } from '@/lib/calendar-engine'
import { createClient } from '@/lib/supabase/client'
import { formatTRY } from '@/lib/pricing-engine'
import RichTextEditor from '@/components/RichTextEditor'
import SuppliersManager from '@/components/admin/SuppliersManager'
import {
  LayoutDashboard,
  Truck,
  Package,
  ShoppingBag,
  Users,
  MapPin,
  Menu as MenuIcon,
  CalendarOff,
  Settings,
  FileSpreadsheet,
  Printer,
  Snowflake,
  BellRing,
  Plus,
  Save,
  Trash2,
  Edit3,
  ExternalLink,
  X,
  Search,
  CheckCircle2,
  Globe,
  Images,
  ShieldAlert,
  LogOut,
  HelpCircle,
  Lock,
  Mail,
  FileText,
  Activity,
  Eye,
  Award,
} from 'lucide-react'

type AdminSection =
  | 'dashboard'
  | 'faqs'
  | 'dispatch'
  | 'products'
  | 'sliders'
  | 'suppliers'
  | 'orders'
  | 'customers'
  | 'logs'
  | 'locations'
  | 'menus'
  | 'corporate'
  | 'calendar'
  | 'admins'
  | 'settings'

function slugifyTR(text: string) {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function AdminDashboardPage() {
  // Admin Güvenlik & Oturum State'i
  const [adminUser, setAdminUser] = useState<any | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>('')

  // Veritabanı State'leri
  const [packages, setPackages] = useState<any[]>([])
  const [sliders, setSliders] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [neighborhoods, setNeighborhoods] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [calendarBlocks, setCalendarBlocks] = useState<any[]>([])
  const [navMenus, setNavMenus] = useState<any[]>([])
  const [corporatePages, setCorporatePages] = useState<any[]>([])
  const [faqs, setFaqs] = useState<any[]>([])
  const [adminUsersList, setAdminUsersList] = useState<any[]>([])
  const [contactMessages, setContactMessages] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])

  const [generalSettings, setGeneralSettings] = useState<any>({
    site_title: 'DietBox | Adrese Teslim Diyet Yemekleri Servisi',
    phone: '0 216 367 24 13',
    whatsapp: '905421482021',
    whatsapp_display: '0 542 148 20 21',
    whatsapp_message:
      'Merhaba DietBox, diyet paketleriniz ve mahalle teslimat saatleriniz hakkında bilgi almak istiyorum.',
    email: 'info@dietboxtr.com',
    address: 'Aydınevler Mah. Kırçiçeği Cad. 34854 Maltepe / İstanbul',
    working_hours: 'Pazartesi - Cumartesi: 06:00 - 18:00',
    delivery_hours_info: 'Teslimat Saatleri : Sabah 06:00 - 09:30 Arasıdır',
    instagram_url: 'https://www.instagram.com/dietboxtr/',
    facebook_url: 'https://www.facebook.com/dietboxtr/',
    top_announcement: 'Teslimat Saatleri : Sabah 06:00 - 09:30 Arasıdır',
    footer_about:
      'Diet Box taze ve besleyici gıda sağlayan, güvenilir kapıda teslimat hizmeti veren kendini sağlıklı beslenme konusunda geliştirmiş bir firmadır.',
    footer_copyright: 'Diet Box. © 2026. Her Hakkı Saklıdır.',
  })

  const [posConfig, setPosConfig] = useState<any>({
    ziraat_active: true,
    paytr_active: true,
    bank_transfer_active: true,
  })

  // Modallar ve Form State'leri
  const [editingPkg, setEditingPkg] = useState<any | null>(null)
  const [editingSlide, setEditingSlide] = useState<any | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [logFilter, setLogFilter] = useState('')

  const [selectedCityFilter, setSelectedCityFilter] = useState<number>(1)
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState<number>(1)
  const [neighSearch, setNeighSearch] = useState('')
  const [editingNeigh, setEditingNeigh] = useState<any | null>(null)
  const [newCityName, setNewCityName] = useState('')
  const [newDistrictName, setNewDistrictName] = useState('')
  const [newDistrictSide, setNewDistrictSide] = useState('Anadolu Yakası')

  const [menuForm, setMenuForm] = useState<{
    id?: number
    parent_id: string
    title: string
    url: string
    sort_order: number
    is_active: boolean
  }>({ parent_id: '', title: '', url: '', sort_order: 1, is_active: true })

  const [faqForm, setFaqForm] = useState<{
    id?: number
    category: string
    question: string
    answer: string
    sort_order: number
    is_active: boolean
  }>({ category: 'Sipariş & Teslimat', question: '', answer: '', sort_order: 1, is_active: true })

  // Kurumsal Sayfa Form State
  const [corpForm, setCorpForm] = useState<{
    id?: number
    slug: string
    title: string
    subtitle: string
    content: string
    sort_order: number
    is_active: boolean
  }>({
    slug: '',
    title: '',
    subtitle: '',
    content: '',
    sort_order: 1,
    is_active: true,
  })

  const [newAdminForm, setNewAdminForm] = useState({
    full_name: '',
    email: '',
    password_plain: '',
    role: 'editor',
  })

  const [blockDateInput, setBlockDateInput] = useState('')
  const [blockReasonInput, setBlockReasonInput] = useState('Resmi Tatil / Bayram')
  const [blockTypeInput, setBlockTypeInput] = useState<'holiday' | 'quota_full'>('holiday')
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  useEffect(() => {
    setSelectedDate(format(getIstanbulNow().istanbulDayStart, 'yyyy-MM-dd'))
    const savedSession = sessionStorage.getItem('dietbox_admin_session')
    if (savedSession) {
      setAdminUser(JSON.parse(savedSession))
    }
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    const supabase = createClient()

    const [
      pkgRes,
      faqRes,
      slideRes,
      citRes,
      distRes,
      neighRes,
      ordRes,
      delRes,
      blkRes,
      menuRes,
      corpRes,
      admRes,
      msgRes,
      genSetRes,
      posSetRes,
      profRes,
      logRes,
    ] = await Promise.all([
      supabase.from('packages').select('*').order('sort_order'),
      supabase.from('faqs').select('*').order('sort_order'),
      supabase.from('sliders').select('*').order('sort_order'),
      supabase.from('cities').select('*').order('id'),
      supabase.from('districts').select('*').order('side').order('name'),
      supabase.from('neighborhoods').select('*').order('name').limit(2000),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('order_deliveries').select('*, orders(*)').order('delivery_date'),
      supabase.from('calendar_blocks').select('*').order('blocked_date'),
      supabase.from('navigation_menus').select('*').order('sort_order'),
      supabase.from('corporate_pages').select('*').order('sort_order'),
      supabase.from('admin_users').select('*').order('id'),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
      supabase.from('system_settings').select('value').eq('key', 'general_settings').single(),
      supabase.from('system_settings').select('value').eq('key', 'pos_config').single(),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500),
    ])

    setPackages(pkgRes.data || [])
    setFaqs(faqRes.data || [])
    setSliders(slideRes.data || [])
    setCities(citRes.data || [])
    setDistricts(distRes.data || [])
    setNeighborhoods(neighRes.data || [])
    setOrders(ordRes.data || [])
    setDeliveries(delRes.data || [])
    setCalendarBlocks(blkRes.data || [])
    setNavMenus(menuRes.data || [])
    setCorporatePages(corpRes.data || [])
    setAdminUsersList(admRes.data || [])
    setContactMessages(msgRes.data || [])
    setProfiles(profRes.data || [])

    try {
      const trackRes = await fetch('/api/track', { cache: 'no-store' })
      const trackJson = await trackRes.json()
      setActivityLogs(trackJson.logs || logRes.data || [])
    } catch {
      setActivityLogs(logRes.data || [])
    }

    if (genSetRes.data?.value) setGeneralSettings(genSetRes.data.value)
    if (posSetRes.data?.value) setPosConfig(posSetRes.data.value)

    setLoading(false)
  }

  useEffect(() => {
    if (adminUser) {
      fetchAllData()
    }
  }, [adminUser])

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_login',
          payload: { email: loginEmail, password: loginPassword },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Giriş yapılamadı.')
        setLoginLoading(false)
        return
      }
      sessionStorage.setItem('dietbox_admin_session', JSON.stringify(data.adminUser))
      setAdminUser(data.adminUser)
    } catch {
      alert('Sunucu bağlantı hatası.')
    } finally {
      setLoginLoading(false)
    }
  }

  const dailyDispatchList = useMemo(() => {
    return deliveries
      .filter(
        (d) =>
          d.delivery_date === selectedDate &&
          ['scheduled', 'preparing', 'delivered'].includes(d.status)
      )
      .sort((a, b) => {
        const distA = a.orders?.district_name || ''
        const distB = b.orders?.district_name || ''
        if (distA !== distB) return distA.localeCompare(distB, 'tr')
        return (a.orders?.neighborhood_name || '').localeCompare(
          b.orders?.neighborhood_name || '',
          'tr'
        )
      })
  }, [deliveries, selectedDate])

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((s, o) => s + Number(o.grand_total || 0), 0)
    const activeOrdersCount = orders.filter((o) => o.status === 'active').length
    const todayPackages = dailyDispatchList.reduce((s, d) => s + Number(d.package_quantity || 1), 0)

    const today = new Date()
    const expiringSoon = orders.filter((o) => {
      if (!o.estimated_end_date || o.status !== 'active') return false
      const diff = differenceInCalendarDays(parseISO(o.estimated_end_date), today)
      return diff >= 0 && diff <= 3
    })

    const customerMap = new Map<string, any>()
    orders.forEach((o) => {
      const key = (o.customer_email || o.customer_phone || o.customer_name || '').toLowerCase()
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: o.customer_name,
          phone: o.customer_phone,
          email: o.customer_email,
          district: o.district_name,
          neighborhood: o.neighborhood_name,
          address: o.full_address,
          height: o.height_cm,
          weight: o.weight_kg,
          notes: o.order_note,
          orderCount: 1,
          totalSpent: Number(o.grand_total || 0),
        })
      } else {
        const existing = customerMap.get(key)
        existing.orderCount += 1
        existing.totalSpent += Number(o.grand_total || 0)
      }
    })

    profiles.forEach((p) => {
      const key = (p.email || p.phone || p.full_name || p.id || '').toLowerCase()
      if (!key) return
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: p.full_name || 'Kayıtlı Üye',
          phone: p.phone || '-',
          email: p.email || null,
          district: p.district || '-',
          neighborhood: p.neighborhood || '-',
          address: p.full_address || '-',
          height: p.height_cm || null,
          weight: p.weight_kg || null,
          notes: p.allergy_notes || null,
          orderCount: 0,
          totalSpent: 0,
        })
      }
    })

    return {
      totalRevenue,
      activeOrdersCount,
      todayPackages,
      expiringSoon,
      customers: Array.from(customerMap.values()),
    }
  }, [orders, profiles, dailyDispatchList])

  const handleExportExcel = () => {
    if (dailyDispatchList.length === 0) {
      alert('Seçilen tarihte sevkiyat bulunmuyor.')
      return
    }
    const rows = dailyDispatchList.map((item, idx) => ({
      'Sıra No': idx + 1,
      Tarih: item.delivery_date,
      'Sipariş No': item.orders?.order_number || '-',
      Müşteri: item.orders?.customer_name || '-',
      Telefon: item.orders?.customer_phone || '-',
      İlçe: item.orders?.district_name || '-',
      Mahalle: item.orders?.neighborhood_name || '-',
      'Açık Adres': item.orders?.full_address || '-',
      Paket: item.orders?.package_title || '-',
      Adet: item.package_quantity > 1 ? `${item.package_quantity} PAKET (C.tesi Çift!)` : '1 Paket',
      'Alerjen / Not': item.orders?.order_note || '-',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Sevkiyat_${selectedDate}`)
    XLSX.writeFile(wb, `DietBox_Sevkiyat_${selectedDate}.xlsx`)
  }

  const openEditPackageModal = (pkg?: any) => {
    if (pkg) {
      const defaultTiers =
        pkg.custom_duration_prices && pkg.custom_duration_prices.length > 0
          ? pkg.custom_duration_prices
          : [
              { days: 5, label: '5 Günlük Paket', total_price: pkg.daily_base_price * 5 },
              { days: 10, label: '10 Günlük Paket', total_price: pkg.daily_base_price * 10 },
              { days: 14, label: '14 Günlük Paket', total_price: pkg.daily_base_price * 14 },
              { days: 20, label: '20 Günlük Paket', total_price: pkg.daily_base_price * 20 },
              { days: 30, label: '30 Günlük Paket', total_price: pkg.daily_base_price * 30 },
            ]

      const defaultMenu =
        pkg.sample_menu_table && pkg.sample_menu_table.length > 0
          ? pkg.sample_menu_table
          : [
              {
                day: 'Örnek Günlük Menü',
                meals: [
                  { title: 'Sabah', desc: '', kcal: '' },
                  { title: 'Öğle', desc: '', kcal: '' },
                  { title: 'Akşam', desc: '', kcal: '' },
                ],
              },
            ]

      setEditingPkg({
        ...pkg,
        custom_duration_prices: JSON.parse(JSON.stringify(defaultTiers)),
        sample_menu_table: JSON.parse(JSON.stringify(defaultMenu)),
      })
    } else {
      setEditingPkg({
        id: null,
        slug: '',
        title: '',
        category: 'Diyet Paketleri',
        daily_base_price: 1100,
        short_description: '',
        full_description: '',
        calories_range: '1200 / 1500 / 1800 kcal',
        protein_info: 'Dengeli Makro',
        meal_count_text: '3 Ana + 2 Ara Öğün',
        cover_image: '',
        is_active: true,
        custom_duration_prices: [
          { days: 5, label: '5 Günlük Paket', total_price: 5500 },
          { days: 10, label: '10 Günlük Paket', total_price: 11000 },
          { days: 14, label: '14 Günlük Paket', total_price: 15400 },
          { days: 20, label: '20 Günlük Paket', total_price: 22000 },
          { days: 30, label: '30 Günlük Paket', total_price: 33000 },
        ],
        sample_menu_table: [
          {
            day: 'Örnek Günlük Menü',
            meals: [
              { title: 'Sabah', desc: '', kcal: '' },
              { title: 'Öğle', desc: '', kcal: '' },
              { title: 'Akşam', desc: '', kcal: '' },
            ],
          },
        ],
      })
    }
  }

  const handleSavePackageModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPkg) return
    const autoSlug = editingPkg.slug || slugifyTR(editingPkg.title)

    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_package_full',
        payload: { ...editingPkg, slug: autoSlug },
      }),
    })
    if (res.ok) {
      alert('Paket, kademeli fiyatlar ve örnek menü kaydedildi!')
      setEditingPkg(null)
      fetchAllData()
    } else {
      const err = await res.json()
      alert(err.error || 'Hata oluştu')
    }
  }

  const navItems: { id: AdminSection; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard },
    { id: 'dispatch', label: 'Günlük Sevkiyat & Excel', icon: Truck, badge: dailyDispatchList.length },
    { id: 'products', label: 'Ürünler & Paket Fiyatları', icon: Package, badge: packages.length },
    { id: 'sliders', label: 'Anasayfa Slider (Resim/Video)', icon: Images, badge: sliders.length },
    { id: 'suppliers', label: 'Tedarikçilerimiz (Logolar)', icon: Award },
    { id: 'orders', label: 'Siparişler & Dondurma', icon: ShoppingBag, badge: orders.length },
    { id: 'customers', label: 'Müşteriler & Mesajlar', icon: Users, badge: stats.customers.length },
    { id: 'logs', label: 'Aktivite & Gezinme Logları', icon: Activity, badge: activityLogs.length },
    { id: 'locations', label: 'İl / İlçe / Mahalle Lojistik', icon: MapPin, badge: neighborhoods.length },
    { id: 'corporate', label: 'Kurumsal Sayfalar', icon: FileText, badge: corporatePages.length },
    { id: 'faqs', label: 'Sıkça Sorulanlar (SSS)', icon: HelpCircle, badge: faqs.length },
    { id: 'menus', label: 'Menü Yöneticisi', icon: MenuIcon, badge: navMenus.length },
    { id: 'calendar', label: 'Tatil & Kota Kapatma', icon: CalendarOff },
    { id: 'admins', label: 'Yetkili Kullanıcılar', icon: ShieldAlert, badge: adminUsersList.length },
    { id: 'settings', label: 'Genel Ayarlar & WhatsApp', icon: Settings },
  ]

  const filteredDistrictsByCity = useMemo(
    () => districts.filter((d) => d.city_id === selectedCityFilter),
    [districts, selectedCityFilter]
  )

  const filteredNeighborhoods = useMemo(() => {
    return neighborhoods.filter((n) => {
      const matchDist = n.district_id === selectedDistrictFilter
      const matchSearch =
        !neighSearch.trim() ||
        n.name.toLowerCase().includes(neighSearch.toLowerCase()) ||
        (n.delivery_time_note || '').toLowerCase().includes(neighSearch.toLowerCase())
      return matchDist && matchSearch
    })
  }, [neighborhoods, selectedDistrictFilter, neighSearch])

  const todayIstanbulStr = format(getIstanbulNow().istanbulDayStart, 'yyyy-MM-dd')

  // GÜVENLİ ADMİN GİRİŞ EKRANI
  if (!adminUser) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <div className="text-2xl font-black tracking-tight">
              <span className="text-[#51a885]">ELA</span>{' '}
              <span className="text-slate-900">Teknoloji &amp; Tasarım</span>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              CYBER PANEL V2.0 • DietBox
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Yetkili E-Posta Adresi
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="admin@eladesign.org"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Şifre</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-sm transition cursor-pointer"
            >
              {loginLoading ? 'Doğrulanıyor...' : 'Panele Güvenli Giriş Yap'}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100">
            <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-emerald-600">
              &larr; Site Ön Yüzüne Dön
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-900">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden"
        />
      )}

      {/* SOL YAN MENÜ (EKRAN BOYUNDA SABİT - SÜNMEZ) */}
      <aside
        className={`fixed lg:sticky lg:top-0 lg:h-screen shrink-0 inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-300 print:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-base font-black tracking-tight leading-none">
              <span className="text-[#5ed3c6]">ELA</span>{' '}
              <span className="text-white">Teknoloji &amp; Tasarım</span>
            </div>
            <span className="block text-[10px] font-bold tracking-[0.22em] text-[#5ed3c6] uppercase">
              CYBER PANEL V2.0
            </span>
            <span className="block text-[11px] font-medium text-slate-400 pt-1">
              {adminUser.full_name} • DietBox
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                      active ? 'bg-white text-emerald-900' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            href="/kurye"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Truck className="w-4 h-4" />
            Kurye Mobil Saha Ekranı
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5" />
              Siteyi Gör
            </Link>
            <button
              onClick={() => {
                sessionStorage.removeItem('dietbox_admin_session')
                setAdminUser(null)
              }}
              className="bg-red-950/60 hover:bg-red-900 text-red-200 text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Çıkış
            </button>
          </div>
        </div>
      </aside>

      {/* SAĞ ANA İÇERİK */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 h-16 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-slate-100 text-slate-700"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900">
              {navItems.find((i) => i.id === activeSection)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {packages.length} Paket • {orders.length} Sipariş • {stats.customers.length} Müşteri • {activityLogs.length} Log
            </span>
          </div>
        </header>

        <main className="p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* 1. GÖSTERGE PANELİ */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase">Toplam Ciro</span>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">
                    {formatTRY(stats.totalRevenue)}
                  </p>
                  <span className="text-xs text-emerald-600 font-semibold">
                    {orders.length} Toplam Sipariş
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Seçili Gün ({selectedDate}) Sevkiyat
                  </span>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                    {stats.todayPackages} Paket
                  </p>
                  <span className="text-xs text-slate-500">
                    {dailyDispatchList.length} Ayrı Adres
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Kayıtlı Müşteri (CRM)
                  </span>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">
                    {stats.customers.length} Kişi
                  </p>
                  <span className="text-xs text-slate-500">
                    {stats.activeOrdersCount} Aktif Abonelik
                  </span>
                </div>

                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-sm">
                  <span className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1.5">
                    <BellRing className="w-4 h-4 text-amber-600" />
                    Paketi Bitecekler
                  </span>
                  <p className="text-2xl font-extrabold text-amber-900 mt-1">
                    {stats.expiringSoon.length} Müşteri
                  </p>
                  <span className="text-xs text-amber-700">Son 3 güne giren paketler</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900">Aktif Siparişler Özeti</h3>
                  <button
                    onClick={() => setActiveSection('orders')}
                    className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                  >
                    Tüm Siparişleri Yönet &rarr;
                  </button>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {orders.map((o) => (
                    <div key={o.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-extrabold text-slate-900">
                          {o.order_number} — {o.customer_name} ({o.customer_phone})
                        </span>
                        <p className="text-slate-500 mt-0.5">
                          {o.package_title} ({o.duration_days} Gün) • {o.district_name} /{' '}
                          {o.neighborhood_name} • Başlangıç: {o.start_date}
                        </p>
                      </div>
                      <span className="font-extrabold text-emerald-700 text-sm">
                        {formatTRY(o.grand_total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. GÜNLÜK SEVKİYAT & EXCEL */}
          {activeSection === 'dispatch' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Günlük Mutfak ve Kurye Sevkiyat Listesi
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tarih seçerek o gün çıkacak paketleri görüntüleyebilir ve Excel (.xlsx) olarak indirebilirsiniz.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 print:hidden">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-semibold"
                  />
                  <button
                    onClick={handleExportExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel (.xlsx) İndir
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    PDF / Yazdır
                  </button>
                </div>
              </div>

              {dailyDispatchList.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  <strong>{selectedDate}</strong> tarihinde planlanmış sevkiyat bulunmuyor.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3">#</th>
                        <th className="p-3">İlçe / Mahalle</th>
                        <th className="p-3">Müşteri &amp; Telefon</th>
                        <th className="p-3">Diyet Paketi</th>
                        <th className="p-3">Adet</th>
                        <th className="p-3">Alerjen / Not</th>
                        <th className="p-3">Açık Adres</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dailyDispatchList.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-3">
                            <strong className="block text-slate-900">
                              {item.orders?.district_name}
                            </strong>
                            <span className="text-xs text-emerald-700 font-semibold">
                              {item.orders?.neighborhood_name}
                            </span>
                          </td>
                          <td className="p-3">
                            <strong className="block text-slate-900">
                              {item.orders?.customer_name}
                            </strong>
                            <span className="text-xs text-slate-500">
                              {item.orders?.customer_phone}
                            </span>
                          </td>
                          <td className="p-3 font-semibold">{item.orders?.package_title}</td>
                          <td className="p-3">
                            {item.package_quantity > 1 ? (
                              <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-2.5 py-1 rounded text-xs">
                                {item.package_quantity} PAKET (C.tesi Çift!)
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded text-xs">
                                1 Paket
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-xs text-red-600 font-medium">
                            {item.orders?.order_note || '-'}
                          </td>
                          <td className="p-3 text-xs text-slate-600 max-w-xs">
                            {item.orders?.full_address}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. ÜRÜNLER VE BAĞIMSIZ PERİYOT FİYATLARI */}
          {activeSection === 'products' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Diyet &amp; Detoks Paketleri ({packages.length} Ürün)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Her paketin gün periyotlarına göre kademeli fiyatlarını, görselini ve örnek menüsünü düzenleyebilirsiniz.
                  </p>
                </div>
                <button
                  onClick={() => openEditPackageModal()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Paket Ekle
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map((pkg) => {
                  const tiers = pkg.custom_duration_prices || []
                  return (
                    <div
                      key={pkg.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={
                            pkg.cover_image ||
                            'https://www.dietboxtr.com/wp-content/uploads/2020/07/dietbox-19.jpg'
                          }
                          alt={pkg.title}
                          className="w-20 h-20 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {pkg.category}
                          </span>
                          <h3 className="font-extrabold text-slate-900 text-base truncate mt-1">
                            {pkg.title}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                            {pkg.short_description}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                          Tanımlı Periyot &amp; Paket Fiyatları:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {tiers.map((t: any, idx: number) => (
                            <span
                              key={idx}
                              className="text-[11px] bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-semibold text-slate-800"
                            >
                              <strong>{t.label || `${t.days} Gün`}:</strong> {formatTRY(t.total_price)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-500">
                          Baz Fiyat: <strong>{formatTRY(pkg.daily_base_price)}</strong>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditPackageModal(pkg)}
                            className="bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Düzenle
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('Bu paketi silmek istediğinize emin misiniz?')) return
                              await fetch('/api/admin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'delete_package',
                                  payload: { id: pkg.id },
                                }),
                              })
                              fetchAllData()
                            }}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-xl cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 4. ANASAYFA SLIDER YÖNETİCİSİ */}
          {activeSection === 'sliders' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Anasayfa Gelişmiş Slider Yöneticisi
                  </h2>
                  <p className="text-xs text-slate-500">
                    Resim veya MP4 video yükleyebilir, fiyat etiketini, başlıkları ve yönlendirme butonunu değiştirebilirsiniz.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setEditingSlide({
                      id: null,
                      badge_text: 'Adrese Teslim Paketler',
                      title: '',
                      subtitle: '',
                      price_highlight: "990 ₺'den başlayan fiyatlarla",
                      button_text: 'Paketi İncele',
                      button_url: '/paketler',
                      media_type: 'image',
                      media_url: '',
                      sort_order: sliders.length + 1,
                      is_active: true,
                    })
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Slayt Ekle
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sliders.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      {s.media_type === 'video' ? (
                        <video
                          src={s.media_url}
                          className="w-28 h-20 rounded-xl object-cover bg-slate-900 shrink-0"
                          muted
                        />
                      ) : (
                        <img
                          src={s.media_url}
                          alt={s.title}
                          className="w-28 h-20 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200"
                        />
                      )}
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {s.badge_text} ({s.media_type === 'video' ? 'Video' : 'Resim'})
                        </span>
                        <h3 className="font-extrabold text-slate-900 text-base mt-1">{s.title}</h3>
                        <span className="inline-block bg-amber-300 text-slate-950 font-black text-xs px-2 py-0.5 rounded mt-1">
                          {s.price_highlight}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-400">Sıra: {s.sort_order}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingSlide(s)}
                          className="bg-slate-900 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl cursor-pointer"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={async () => {
                            await fetch('/api/admin', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'delete_slider',
                                payload: { id: s.id },
                              }),
                            })
                            fetchAllData()
                          }}
                          className="text-red-500 p-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4.5 TEDARİKÇİLERİMİZ (GERÇEK LOGOLAR & FOOTER KAYAN BAR) */}
          {activeSection === 'suppliers' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Tedarikçilerimiz &amp; Logo Yönetimi
                  </h2>
                  <p className="text-xs text-slate-500">
                    Buradan eklediğiniz veya gizlediğiniz markalar hem footer üstü kayan barda hem de Tedarikçilerimiz sayfasında anlık güncellenir.
                  </p>
                </div>
                <Link
                  href="/tedarikcilerimiz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl inline-flex items-center gap-2 transition"
                >
                  Tedarikçilerimiz Sayfasını Gör
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <SuppliersManager />
            </div>
          )}

          {/* 5. SİPARİŞLER & DONDURMA */}
          {activeSection === 'orders' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900">
                Tüm Siparişler ve Teslimat Günü Dondurma ({orders.length})
              </h2>
              <div className="space-y-3">
                {orders.map((order) => {
                  const orderDeliveries = deliveries.filter((d) => d.order_id === order.id)
                  const isExpanded = expandedOrderId === order.id
                  return (
                    <div
                      key={order.id}
                      className="border border-slate-200 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold bg-slate-900 text-white px-2.5 py-0.5 rounded">
                              {order.order_number}
                            </span>
                            <span className="font-bold text-slate-900">{order.customer_name}</span>
                            <span className="text-xs text-slate-500">({order.customer_phone})</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            {order.package_title} ({order.duration_days} Gün) •{' '}
                            <strong>
                              {order.district_name} / {order.neighborhood_name}
                            </strong>{' '}
                            • Bitiş:{' '}
                            <strong className="text-emerald-700">{order.estimated_end_date}</strong>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-base font-extrabold text-emerald-700">
                            {formatTRY(order.grand_total)}
                          </span>
                          <button
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                          >
                            <Snowflake className="w-3.5 h-3.5 text-blue-600" />
                            {isExpanded ? 'Takvimi Gizle' : 'Takvimi Aç / Gün Dondur'}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                          {orderDeliveries.map((del) => {
                            const freezeCheck = getFreezeEligibility(del.delivery_date)
                            const isPast = del.delivery_date <= todayIstanbulStr

                            return (
                              <div
                                key={del.id}
                                className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                                  del.status === 'frozen'
                                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                                    : del.status === 'delivered'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : isPast
                                    ? 'bg-slate-100 border-slate-200 text-slate-400'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <div>
                                  <span className="font-bold block">{del.delivery_date}</span>
                                  <span className="text-[11px] opacity-80">
                                    {del.package_quantity} Paket • {del.status}
                                  </span>
                                </div>

                                {del.status === 'scheduled' && freezeCheck.canFreeze && (
                                  <button
                                    onClick={async () => {
                                      const res = await fetch('/api/admin', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          action: 'freeze_delivery_day',
                                          payload: { deliveryId: del.id, orderId: order.id },
                                        }),
                                      })
                                      const data = await res.json()
                                      if (res.ok) fetchAllData()
                                      else alert(data.error || 'İşlem yapılamadı.')
                                    }}
                                    className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-1 rounded cursor-pointer"
                                  >
                                    Dondur
                                  </button>
                                )}

                                {del.status === 'scheduled' && !freezeCheck.canFreeze && (
                                  <span
                                    title={freezeCheck.reason}
                                    className="mt-2 block text-center bg-slate-200/80 text-slate-600 text-[10px] font-bold py-1 px-1.5 rounded"
                                  >
                                    {isPast ? 'Tarihi Geçti' : 'Süre Doldu (12:00)'}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 6. MÜŞTERİLER (CRM - DETAY MODALLI) VE İLETİŞİM MESAJLARI */}
          {activeSection === 'customers' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Müşteri Listesi ({stats.customers.length} Kişi)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Detaylı sipariş geçmişini ve incelediği sayfaları görmek için müşteriye tıklayın.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3">Müşteri Adı</th>
                        <th className="p-3">Telefon &amp; E-Posta</th>
                        <th className="p-3">Bölge / Mahalle</th>
                        <th className="p-3">Boy / Kilo</th>
                        <th className="p-3">Alerjen / Not</th>
                        <th className="p-3">Toplam Harcama</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.customers.map((c, i) => (
                        <tr
                          key={i}
                          onClick={() => setSelectedCustomer(c)}
                          className="hover:bg-emerald-50/50 cursor-pointer transition"
                        >
                          <td className="p-3 font-bold text-slate-900">{c.name}</td>
                          <td className="p-3">
                            <span className="block font-semibold">{c.phone}</span>
                            <span className="text-xs text-slate-400">{c.email || '-'}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold block">{c.district}</span>
                            <span className="text-xs text-slate-500">{c.neighborhood}</span>
                          </td>
                          <td className="p-3 text-xs">
                            {c.height || '-'} cm / {c.weight || '-'} kg
                          </td>
                          <td className="p-3 text-xs text-red-600">{c.notes || '-'}</td>
                          <td className="p-3 font-extrabold text-emerald-700">
                            <div className="flex items-center justify-between gap-2">
                              <span>{formatTRY(c.totalSpent)}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedCustomer(c)
                                }}
                                className="bg-slate-900 hover:bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Detay
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-extrabold text-slate-900 text-base">
                  İletişim Sayfasından Gelen Mesajlar ({contactMessages.length})
                </h3>
                {contactMessages.length === 0 ? (
                  <p className="text-xs text-slate-500">Henüz iletişim formu mesajı yok.</p>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {contactMessages.map((m) => (
                      <div key={m.id} className="py-3 space-y-1">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>
                            {m.full_name} — {m.phone} ({m.email})
                          </span>
                          <span className="text-slate-400">{m.created_at?.slice(0, 10)}</span>
                        </div>
                        <p className="text-slate-600">{m.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. AKTİVİTE & GEZİNME LOGLARI */}
          {activeSection === 'logs' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Müşteri &amp; Ziyaretçi Aktivite Logları ({activityLogs.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Hangi müşteri veya ziyaretçi hangi sayfaya, hangi pakete ne zaman bakmış anlık takip edin.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Müşteri adı, e-posta, sayfa veya paket ara..."
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs"
                    />
                  </div>
                  {logFilter && (
                    <button
                      type="button"
                      onClick={() => setLogFilter('')}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 px-2 py-2 cursor-pointer"
                    >
                      Temizle
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="p-3">Tarih / Saat</th>
                      <th className="p-3">Müşteri / Ziyaretçi</th>
                      <th className="p-3">İşlem Türü</th>
                      <th className="p-3">İncelenen Sayfa (URL)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activityLogs
                      .filter((l) => {
                        const q = logFilter.trim().toLowerCase()
                        if (!q) return true
                        return (
                          (l.customer_name || '').toLowerCase().includes(q) ||
                          (l.customer_email || '').toLowerCase().includes(q) ||
                          (l.visitor_id || '').toLowerCase().includes(q) ||
                          (l.path || '').toLowerCase().includes(q)
                        )
                      })
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('tr-TR')}
                          </td>
                          <td className="p-3">
                            {log.customer_email ? (
                              <div>
                                <strong className="text-slate-900 block">
                                  {log.customer_name || 'Kayıtlı Üye'}
                                </strong>
                                <span className="text-[11px] text-emerald-700">
                                  {log.customer_email}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono">
                                Misafir ({log.visitor_id || '-'})
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                log.action_type === 'package_view'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : log.action_type === 'checkout_view'
                                  ? 'bg-amber-100 text-amber-800'
                                  : log.action_type === 'calculator_view'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {log.action_type === 'package_view'
                                ? 'Paket İnceledi'
                                : log.action_type === 'checkout_view'
                                ? 'Ödeme Sayfası'
                                : log.action_type === 'calculator_view'
                                ? 'Kalori Hesapladı'
                                : 'Sayfa Görüntüleme'}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-800">
                            <span className="block">{log.path}</span>
                            <span className="text-[11px] text-slate-400">{log.page_title}</span>
                          </td>
                        </tr>
                      ))}
                    {activityLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">
                          Henüz kayıtlı aktivite logu bulunmuyor.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8. İL, İLÇE VE MAHALLE LOJİSTİK YÖNETİMİ */}
          {activeSection === 'locations' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      1. Şehir (İl) Yönetimi (İstanbul Aktif, Ankara Pasif)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ankara ve ilçeleri yüklüdür; tek tıkla aktif edebilir veya yeni şehir ekleyebilirsiniz.
                    </p>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault()
                      if (!newCityName.trim()) return
                      await fetch('/api/admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'save_city',
                          payload: { name: newCityName.trim(), is_active: true },
                        }),
                      })
                      setNewCityName('')
                      fetchAllData()
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Yeni İl Adı"
                      value={newCityName}
                      onChange={(e) => setNewCityName(e.target.value)}
                      className="border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    />
                    <button
                      type="submit"
                      className="bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer"
                    >
                      + İl Ekle
                    </button>
                  </form>
                </div>

                <div className="flex flex-wrap gap-3">
                  {cities.map((city) => (
                    <div
                      key={city.id}
                      onClick={() => {
                        setSelectedCityFilter(city.id)
                        const firstDist = districts.find((d) => d.city_id === city.id)
                        if (firstDist) setSelectedDistrictFilter(firstDist.id)
                      }}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-5 cursor-pointer ${
                        selectedCityFilter === city.id
                          ? 'border-emerald-600 bg-emerald-50/50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm block">
                          {city.name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {districts.filter((d) => d.city_id === city.id).length} İlçe
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          await fetch('/api/admin', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'save_city',
                              payload: {
                                id: city.id,
                                name: city.name,
                                is_active: !city.is_active,
                              },
                            }),
                          })
                          fetchAllData()
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          city.is_active
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {city.is_active ? 'Aktif' : 'Pasif'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    2. İlçeler ({filteredDistrictsByCity.length})
                  </h3>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault()
                      if (!newDistrictName.trim()) return
                      await fetch('/api/admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'save_district',
                          payload: {
                            city_id: selectedCityFilter,
                            side: newDistrictSide,
                            name: newDistrictName.trim(),
                            is_active: true,
                            default_daily_fee: 0,
                          },
                        }),
                      })
                      setNewDistrictName('')
                      fetchAllData()
                    }}
                    className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newDistrictSide}
                        onChange={(e) => setNewDistrictSide(e.target.value)}
                        className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white"
                      >
                        <option value="Anadolu Yakası">Anadolu Yakası</option>
                        <option value="Avrupa Yakası">Avrupa Yakası</option>
                        <option value="Merkez">Merkez</option>
                      </select>
                      <input
                        type="text"
                        placeholder="İlçe Adı"
                        value={newDistrictName}
                        onChange={(e) => setNewDistrictName(e.target.value)}
                        className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-slate-900 text-white text-xs font-bold py-1.5 rounded-lg cursor-pointer"
                    >
                      + İlçeyi Kaydet
                    </button>
                  </form>

                  <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                    {filteredDistrictsByCity.map((d) => {
                      const count = neighborhoods.filter((n) => n.district_id === d.id).length
                      const isSel = selectedDistrictFilter === d.id
                      return (
                        <div
                          key={d.id}
                          onClick={() => setSelectedDistrictFilter(d.id)}
                          className={`p-3 rounded-xl flex items-center justify-between cursor-pointer ${
                            isSel ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <span className="text-[10px] opacity-75 block">{d.side}</span>
                            <span className="text-sm">{d.name}</span>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              isSel ? 'bg-white text-emerald-900' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {count} Mah.
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-extrabold text-slate-900 text-base">
                      3. Mahalleler &amp; Ek Ücretler ({filteredNeighborhoods.length})
                    </h3>
                    <button
                      onClick={() =>
                        setEditingNeigh({
                          id: null,
                          district_id: selectedDistrictFilter,
                          name: '',
                          is_active: true,
                          custom_daily_fee: 0,
                          delivery_time_note: '06:30 - 09:00',
                          period_fees: { '5': 0, '10': 0, '14': 0, '20': 0, '30': 0 },
                        })
                      }
                      className="bg-emerald-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Yeni Mahalle Ekle
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Mahalle ara..."
                      value={neighSearch}
                      onChange={(e) => setNeighSearch(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs"
                    />
                  </div>

                  <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                    {filteredNeighborhoods.map((n) => (
                      <div
                        key={n.id}
                        className="py-3 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">{n.name}</span>
                          <span className="text-xs text-slate-500">
                            {n.delivery_time_note} • Günlük Ek: {n.custom_daily_fee || 0} ₺
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingNeigh(n)}
                            className="bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={async () => {
                              await fetch('/api/admin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'save_neighborhood_full',
                                  payload: { ...n, is_active: !n.is_active },
                                }),
                              })
                              fetchAllData()
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                              n.is_active
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {n.is_active ? 'Açık' : 'Kapalı'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 9. KURUMSAL SAYFALAR YÖNETİCİSİ */}
          {activeSection === 'corporate' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 h-fit">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {corpForm.id ? 'Kurumsal Sayfayı Düzenle' : 'Yeni Kurumsal Sayfa Ekle'}
                  </h3>
                  {corpForm.id && (
                    <button
                      type="button"
                      onClick={() =>
                        setCorpForm({
                          slug: '',
                          title: '',
                          subtitle: '',
                          content: '',
                          sort_order: corporatePages.length + 1,
                          is_active: true,
                        })
                      }
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      + Yeni Sayfa Moduna Geç
                    </button>
                  )}
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const finalSlug = slugifyTR(corpForm.slug || corpForm.title)
                    const res = await fetch('/api/admin', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'save_corporate_page',
                        payload: { ...corpForm, slug: finalSlug },
                      }),
                    })
                    if (res.ok) {
                      alert(`Kurumsal sayfa kaydedildi! Adres: /kurumsal/${finalSlug}`)
                      setCorpForm({
                        slug: '',
                        title: '',
                        subtitle: '',
                        content: '',
                        sort_order: corporatePages.length + 1,
                        is_active: true,
                      })
                      fetchAllData()
                    } else {
                      const err = await res.json()
                      alert(err.error || 'Kurumsal sayfa kaydedilemedi.')
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sayfa Başlığı
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Teslimat Saatleri & Bölgelerimiz"
                      value={corpForm.title}
                      onChange={(e) => {
                        const title = e.target.value
                        setCorpForm({
                          ...corpForm,
                          title,
                          slug: corpForm.id ? corpForm.slug : slugifyTR(title),
                        })
                      }}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        URL Kısa Adı (Slug)
                      </label>
                      <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                        <span className="px-2.5 text-xs text-slate-500 font-semibold border-r border-slate-200">
                          /kurumsal/
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="teslimat-bilgisi"
                          value={corpForm.slug}
                          onChange={(e) =>
                            setCorpForm({ ...corpForm, slug: slugifyTR(e.target.value) })
                          }
                          className="flex-1 bg-white px-2.5 py-2 text-xs font-bold focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Sıra</label>
                      <input
                        type="number"
                        value={corpForm.sort_order}
                        onChange={(e) =>
                          setCorpForm({ ...corpForm, sort_order: Number(e.target.value) })
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Alt Başlık / Kısa Özet
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: İstanbul genelinde sabah 06:00 - 09:30 arası teslimat."
                      value={corpForm.subtitle}
                      onChange={(e) => setCorpForm({ ...corpForm, subtitle: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sayfa İçeriği (Zengin Metin Editörü)
                    </label>
                    <RichTextEditor
                      value={corpForm.content}
                      onChange={(html) => setCorpForm({ ...corpForm, content: html })}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={corpForm.is_active}
                      onChange={(e) => setCorpForm({ ...corpForm, is_active: e.target.checked })}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    Sayfa Yayında (Aktif)
                  </label>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {corpForm.id ? 'Kurumsal Sayfayı Güncelle' : '+ Yeni Kurumsal Sayfa Oluştur'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Kayıtlı Kurumsal Sayfalar ({corporatePages.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Menü Yöneticisinde bu sayfalara bağlanmak için altlarında yazan <strong>/kurumsal/...</strong> adresini kullanın.
                  </p>
                </div>

                {corporatePages.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">
                    Henüz kayıtlı kurumsal sayfa yok. Soldaki formdan ekleyebilir veya SQL başlangıç verisini çalıştırabilirsiniz.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {corporatePages.map((p) => (
                      <div
                        key={p.id}
                        className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-sm">
                                {p.title}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  p.is_active
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {p.is_active ? 'Aktif' : 'Taslak'}
                              </span>
                            </div>
                            <code className="text-[11px] text-emerald-700 font-bold block mt-1">
                              /kurumsal/{p.slug}
                            </code>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={`/kurumsal/${p.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Sayfayı Ön Yüzde Aç"
                              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-600"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                setCorpForm({
                                  id: p.id,
                                  slug: p.slug,
                                  title: p.title,
                                  subtitle: p.subtitle || '',
                                  content: p.content || '',
                                  sort_order: p.sort_order || 1,
                                  is_active: p.is_active ?? true,
                                })
                              }
                              className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm(`"${p.title}" sayfasını silmek istediğinize emin misiniz?`))
                                  return
                                await fetch('/api/admin', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    action: 'delete_corporate_page',
                                    payload: { id: p.id },
                                  }),
                                })
                                fetchAllData()
                              }}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {p.subtitle && (
                          <p className="text-xs text-slate-500 line-clamp-2">{p.subtitle}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 10. SIKÇA SORULAN SORULAR (SSS) YÖNETİCİSİ */}
          {activeSection === 'faqs' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 h-fit">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {faqForm.id ? 'Soruyu Düzenle' : 'Yeni SSS Maddesi Ekle'}
                  </h3>
                  {faqForm.id && (
                    <button
                      type="button"
                      onClick={() =>
                        setFaqForm({
                          category: 'Sipariş & Teslimat',
                          question: '',
                          answer: '',
                          sort_order: faqs.length + 1,
                          is_active: true,
                        })
                      }
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      + Yeni Soru
                    </button>
                  )}
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const res = await fetch('/api/admin', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'save_faq', payload: faqForm }),
                    })
                    if (res.ok) {
                      alert('Soru kaydedildi!')
                      setFaqForm({
                        category: 'Sipariş & Teslimat',
                        question: '',
                        answer: '',
                        sort_order: faqs.length + 1,
                        is_active: true,
                      })
                      fetchAllData()
                    } else {
                      const err = await res.json()
                      alert(err.error || 'Soru kaydedilemedi.')
                    }
                  }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                      <select
                        value={faqForm.category}
                        onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                      >
                        <option value="Sipariş & Teslimat">Sipariş &amp; Teslimat</option>
                        <option value="Paketler & Beslenme">Paketler &amp; Beslenme</option>
                        <option value="Dondurma & İptal">Dondurma &amp; İptal</option>
                        <option value="Ödeme & Fatura">Ödeme &amp; Fatura</option>
                        <option value="Genel">Genel</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Sıra</label>
                      <input
                        type="number"
                        value={faqForm.sort_order}
                        onChange={(e) =>
                          setFaqForm({ ...faqForm, sort_order: Number(e.target.value) })
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Soru</label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Paketlerim saat kaçta teslim ediliyor?"
                      value={faqForm.question}
                      onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cevap</label>
                    <textarea
                      rows={5}
                      required
                      value={faqForm.answer}
                      onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                  >
                    {faqForm.id ? 'Soruyu Güncelle' : '+ Soruyu Ekle'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Kayıtlı Sorular ({faqs.length})
                  </h3>
                  <a
                    href="/sikca-sorulan-sorular"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    SSS Sayfasını Gör <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="space-y-2.5">
                  {faqs.map((f) => (
                    <div
                      key={f.id}
                      className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-emerald-700 uppercase">
                          {f.category} • Sıra {f.sort_order}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{f.question}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2">{f.answer}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setFaqForm(f)}
                          className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('Bu soruyu silmek istediğinize emin misiniz?')) return
                            await fetch('/api/admin', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'delete_faq', payload: { id: f.id } }),
                            })
                            fetchAllData()
                          }}
                          className="text-red-500 p-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 11. MENÜ YÖNETİCİSİ */}
          {activeSection === 'menus' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 h-fit">
                <h3 className="text-base font-extrabold text-slate-900">
                  {menuForm.id ? 'Menü Öğesini Düzenle' : 'Yeni Üst / Alt Menü Ekle'}
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const res = await fetch('/api/admin', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'save_menu_item',
                        payload: menuForm,
                      }),
                    })
                    if (res.ok) {
                      alert('Menü başarıyla kaydedildi!')
                      setMenuForm({
                        parent_id: '',
                        title: '',
                        url: '',
                        sort_order: 1,
                        is_active: true,
                      })
                      fetchAllData()
                    } else {
                      const err = await res.json()
                      alert(err.error || 'Menü eklenemedi')
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Üst Menü Seçin (Ana Menü ise boş bırakın)
                    </label>
                    <select
                      value={menuForm.parent_id}
                      onChange={(e) => setMenuForm({ ...menuForm, parent_id: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="">-- Ana Üst Menü Olarak Ekle --</option>
                      {navMenus
                        .filter((m) => !m.parent_id)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            Alt Menü Olarak Bağla: {m.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Menü Başlığı
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Kalori Hesaplama veya Fiyatlarımız"
                      value={menuForm.title}
                      onChange={(e) => setMenuForm({ ...menuForm, title: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Hedef Link (URL)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: /kalori-hesaplama veya /tedarikcilerimiz"
                      value={menuForm.url}
                      onChange={(e) => setMenuForm({ ...menuForm, url: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sıralama</label>
                    <input
                      type="number"
                      value={menuForm.sort_order}
                      onChange={(e) =>
                        setMenuForm({ ...menuForm, sort_order: Number(e.target.value) })
                      }
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                  >
                    {menuForm.id ? 'Menüyü Güncelle' : '+ Menüyü Ekle'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-extrabold text-slate-900">
                  Mevcut Üst Menü ve Açılır Alt Menü Ağacı
                </h3>
                <div className="space-y-3">
                  {navMenus
                    .filter((m) => !m.parent_id)
                    .map((parent) => {
                      const children = navMenus.filter((c) => c.parent_id === parent.id)
                      return (
                        <div
                          key={parent.id}
                          className="border border-slate-200 rounded-2xl p-4 space-y-2 bg-slate-50/40"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-extrabold text-slate-900 text-sm">
                                {parent.title}
                              </span>
                              <span className="text-xs text-slate-400 ml-2">({parent.url})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  setMenuForm({
                                    id: parent.id,
                                    parent_id: '',
                                    title: parent.title,
                                    url: parent.url,
                                    sort_order: parent.sort_order,
                                    is_active: parent.is_active,
                                  })
                                }
                                className="text-xs font-bold text-emerald-700 cursor-pointer"
                              >
                                Düzenle
                              </button>
                              <button
                                onClick={async () => {
                                  await fetch('/api/admin', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      action: 'delete_menu_item',
                                      payload: { id: parent.id },
                                    }),
                                  })
                                  fetchAllData()
                                }}
                                className="text-red-500 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {children.length > 0 && (
                            <div className="pl-4 border-l-2 border-emerald-500 space-y-1.5 pt-1">
                              {children.map((ch) => (
                                <div
                                  key={ch.id}
                                  className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200"
                                >
                                  <span>
                                    &rarr; <strong>{ch.title}</strong>{' '}
                                    <span className="text-slate-400">({ch.url})</span>
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        setMenuForm({
                                          id: ch.id,
                                          parent_id: String(ch.parent_id || ''),
                                          title: ch.title,
                                          url: ch.url,
                                          sort_order: ch.sort_order,
                                          is_active: ch.is_active,
                                        })
                                      }
                                      className="text-emerald-700 font-bold cursor-pointer"
                                    >
                                      Düzenle
                                    </button>
                                    <button
                                      onClick={async () => {
                                        await fetch('/api/admin', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            action: 'delete_menu_item',
                                            payload: { id: ch.id },
                                          }),
                                        })
                                        fetchAllData()
                                      }}
                                      className="text-red-500 font-bold cursor-pointer"
                                    >
                                      Sil
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          )}

          {/* 12. TATİL & KOTA KAPATMA */}
          {activeSection === 'calendar' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-extrabold text-slate-900">
                  Resmi Tatil / Özel Gün Kapatma
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (!blockDateInput) return
                    const res = await fetch('/api/admin', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'add_calendar_block',
                        payload: {
                          blockedDate: blockDateInput,
                          reason: blockReasonInput,
                          blockType: blockTypeInput,
                        },
                      }),
                    })
                    if (res.ok) {
                      setBlockDateInput('')
                      fetchAllData()
                    }
                  }}
                  className="space-y-3"
                >
                  <input
                    type="date"
                    required
                    value={blockDateInput}
                    onChange={(e) => setBlockDateInput(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                  />
                  <select
                    value={blockTypeInput}
                    onChange={(e) => setBlockTypeInput(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                  >
                    <option value="holiday">Resmi Tatil (Aktif Aboneleri +1 Gün Kaydır)</option>
                    <option value="quota_full">Kota Dolu (Sadece Yeni Siparişe Kapat)</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={blockReasonInput}
                    onChange={(e) => setBlockReasonInput(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="w-full bg-red-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                  >
                    Tarihi Kapat
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-extrabold text-slate-900">Kapalı Günler</h3>
                <div className="divide-y divide-slate-100">
                  {calendarBlocks.map((b) => (
                    <div key={b.id} className="py-3 flex items-center justify-between">
                      <div>
                        <strong className="text-sm block">{b.blocked_date}</strong>
                        <span className="text-xs text-slate-500">{b.reason}</span>
                      </div>
                      <button
                        onClick={async () => {
                          await fetch('/api/admin', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'delete_calendar_block',
                              payload: { id: b.id },
                            }),
                          })
                          fetchAllData()
                        }}
                        className="text-red-600 p-2 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 13. YETKİLİ KULLANICILAR YÖNETİMİ */}
          {activeSection === 'admins' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 h-fit">
                <h3 className="text-base font-extrabold text-slate-900">
                  Yeni Yetkili Kullanıcı Ekle
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const res = await fetch('/api/admin', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'save_admin_user',
                        payload: newAdminForm,
                      }),
                    })
                    if (res.ok) {
                      alert('Yetkili kullanıcı kaydedildi!')
                      setNewAdminForm({
                        full_name: '',
                        email: '',
                        password_plain: '',
                        role: 'editor',
                      })
                      fetchAllData()
                    }
                  }}
                  className="space-y-3"
                >
                  <input
                    type="text"
                    required
                    placeholder="Ad Soyad (Örn: Merve Hanım)"
                    value={newAdminForm.full_name}
                    onChange={(e) =>
                      setNewAdminForm({ ...newAdminForm, full_name: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                  />
                  <input
                    type="email"
                    required
                    placeholder="E-Posta Adresi"
                    value={newAdminForm.email}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Giriş Şifresi"
                    value={newAdminForm.password_plain}
                    onChange={(e) =>
                      setNewAdminForm({ ...newAdminForm, password_plain: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                  />
                  <select
                    value={newAdminForm.role}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                  >
                    <option value="super_admin">Tam Yetkili Yönetici (Super Admin)</option>
                    <option value="editor">Operasyon &amp; Diyetisyen (Editör)</option>
                    <option value="kitchen">Mutfak &amp; Sevkiyat Sorumlusu</option>
                  </select>
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                  >
                    + Yetkili Kullanıcıyı Kaydet
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-extrabold text-slate-900">
                  Kayıtlı Panel Yöneticileri ({adminUsersList.length})
                </h3>
                <div className="divide-y divide-slate-100">
                  {adminUsersList.map((u) => (
                    <div key={u.id} className="py-3 flex items-center justify-between">
                      <div>
                        <strong className="text-sm text-slate-900 block">{u.full_name}</strong>
                        <span className="text-xs text-slate-500">
                          {u.email} • Yetki: <strong>{u.role}</strong>
                        </span>
                      </div>
                      {adminUsersList.length > 1 && (
                        <button
                          onClick={async () => {
                            await fetch('/api/admin', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'delete_admin_user',
                                payload: { id: u.id },
                              }),
                            })
                            fetchAllData()
                          }}
                          className="text-red-500 p-2 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 14. GENEL AYARLAR, WHATSAPP, SOSYAL MEDYA VE GOOGLE YORUMLARI */}
          {activeSection === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  await fetch('/api/admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'save_system_setting',
                      payload: { key: 'general_settings', value: generalSettings },
                    }),
                  })
                  alert('Genel iletişim, telefon ve WhatsApp ayarları kaydedildi!')
                }}
                className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4"
              >
                <h3 className="text-base font-extrabold text-slate-900">
                  Genel Site, İletişim ve Yüzen WhatsApp / Arama Ayarları
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Site Başlığı
                    </label>
                    <input
                      type="text"
                      value={generalSettings.site_title || ''}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, site_title: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Hemen Ara / Canlı Destek Telefonu
                    </label>
                    <input
                      type="text"
                      value={generalSettings.phone || ''}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, phone: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      WhatsApp Numarası (90542...)
                    </label>
                    <input
                      type="text"
                      value={generalSettings.whatsapp || ''}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, whatsapp: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-emerald-800 mb-1">
                      Yüzen WhatsApp Butonu Hazır Mesaj Metni
                    </label>
                    <input
                      type="text"
                      value={generalSettings.whatsapp_message || ''}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          whatsapp_message: e.target.value,
                        })
                      }
                      className="w-full border border-emerald-300 bg-emerald-50/40 rounded-xl px-3.5 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kurumsal E-Posta
                    </label>
                    <input
                      type="email"
                      value={generalSettings.email || ''}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, email: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Üst Duyuru Bandı (Teslimat Saatleri)
                    </label>
                    <input
                      type="text"
                      value={generalSettings.top_announcement || ''}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          top_announcement: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Merkez / İletişim Adresi
                    </label>
                    <input
                      type="text"
                      value={generalSettings.address || ''}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, address: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Tüm Ayarları Kaydet
                </button>
              </form>

              <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 h-fit">
                <h3 className="text-base font-extrabold text-slate-900">
                  Ödeme Yöntemleri (PayTR &amp; Havale)
                </h3>

                <div className="space-y-2.5">
                  {[
                    { key: 'paytr_active', label: 'PayTR Sanal POS (Kredi / Banka Kartı)' },
                    { key: 'bank_transfer_active', label: 'Banka Havalesi / EFT' },
                    { key: 'ziraat_active', label: 'Ziraat Bankası Sanal POS (Yakında)' },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(posConfig[item.key])}
                        onChange={(e) =>
                          setPosConfig({ ...posConfig, [item.key]: e.target.checked })
                        }
                        className="w-5 h-5 accent-emerald-600"
                      />
                    </label>
                  ))}
                </div>

                {/* HAVALE / EFT BANKA HESAPLARI */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800">
                      Havale / EFT Banka Hesapları
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const list = Array.isArray(posConfig.bank_accounts)
                          ? posConfig.bank_accounts
                          : []
                        setPosConfig({
                          ...posConfig,
                          bank_accounts: [
                            ...list,
                            {
                              id: `bank-${Date.now()}`,
                              bank_name: '',
                              account_name: '',
                              iban: '',
                            },
                          ],
                        })
                      }}
                      className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Hesap Ekle
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {(Array.isArray(posConfig.bank_accounts) ? posConfig.bank_accounts : []).map(
                      (acc: any, idx: number, arr: any[]) => (
                        <div
                          key={acc.id || idx}
                          className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Banka Adı (Örn: ZİRAAT BANKASI)"
                              value={acc.bank_name || ''}
                              onChange={(e) => {
                                const next = arr.map((a, i) =>
                                  i === idx ? { ...a, bank_name: e.target.value } : a
                                )
                                setPosConfig({ ...posConfig, bank_accounts: next })
                              }}
                              className="flex-1 border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = arr.filter((_, i) => i !== idx)
                                setPosConfig({ ...posConfig, bank_accounts: next })
                              }}
                              className="text-red-500 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Hesap Sahibi Ünvanı"
                            value={acc.account_name || ''}
                            onChange={(e) => {
                              const next = arr.map((a, i) =>
                                i === idx ? { ...a, account_name: e.target.value } : a
                              )
                              setPosConfig({ ...posConfig, bank_accounts: next })
                            }}
                            className="w-full border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="IBAN (TR..)"
                            value={acc.iban || ''}
                            onChange={(e) => {
                              const next = arr.map((a, i) =>
                                i === idx ? { ...a, iban: e.target.value } : a
                              )
                              setPosConfig({ ...posConfig, bank_accounts: next })
                            }}
                            className="w-full border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs font-mono"
                          />
                        </div>
                      )
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Havale Talimatı (Ödeme &amp; Teşekkür Ekranında Görünür)
                    </label>
                    <textarea
                      rows={2}
                      value={posConfig.bank_transfer_instructions || ''}
                      onChange={(e) =>
                        setPosConfig({ ...posConfig, bank_transfer_instructions: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/admin', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'save_system_setting',
                        payload: { key: 'pos_config', value: posConfig },
                      }),
                    })
                    alert('Ödeme yöntemleri ve havale bilgileri kaydedildi!')
                  }}
                  className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Save className="w-4 h-4" />
                  Ödeme &amp; Havale Ayarlarını Kaydet
                </button>
              </div>

              {/* SOSYAL MEDYA HESAPLARI (+ İLE ARTIRILABİLİR) */}
              <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Sosyal Medya Hesapları</h3>
                    <p className="text-xs text-slate-500">
                      Eklediğiniz hesaplar hem Footer&apos;da hem sağ kenardaki yüzen barda otomatik görünür.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const current = Array.isArray(generalSettings.social_links)
                        ? generalSettings.social_links
                        : [
                            {
                              id: 'ig',
                              platform: 'instagram',
                              label: 'Instagram',
                              url: generalSettings.instagram_url || 'https://www.instagram.com/dietboxtr/',
                            },
                            {
                              id: 'fb',
                              platform: 'facebook',
                              label: 'Facebook',
                              url: generalSettings.facebook_url || 'https://www.facebook.com/dietboxtr/',
                            },
                          ]
                      setGeneralSettings({
                        ...generalSettings,
                        social_links: [
                          ...current,
                          { id: `soc-${Date.now()}`, platform: 'instagram', label: 'Instagram', url: '' },
                        ],
                      })
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Hesap Ekle
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(Array.isArray(generalSettings.social_links)
                    ? generalSettings.social_links
                    : [
                        {
                          id: 'ig',
                          platform: 'instagram',
                          label: 'Instagram',
                          url: generalSettings.instagram_url || 'https://www.instagram.com/dietboxtr/',
                        },
                        {
                          id: 'fb',
                          platform: 'facebook',
                          label: 'Facebook',
                          url: generalSettings.facebook_url || 'https://www.facebook.com/dietboxtr/',
                        },
                      ]
                  ).map((soc: any, idx: number, arr: any[]) => (
                    <div
                      key={soc.id || idx}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                    >
                      <select
                        value={soc.platform}
                        onChange={(e) => {
                          const p = e.target.value
                          const labels: Record<string, string> = {
                            instagram: 'Instagram',
                            facebook: 'Facebook',
                            youtube: 'YouTube',
                            tiktok: 'TikTok',
                            x: 'X (Twitter)',
                            linkedin: 'LinkedIn',
                            other: 'Diğer',
                          }
                          const next = arr.map((item, i) =>
                            i === idx ? { ...item, platform: p, label: labels[p] || 'Sosyal Medya' } : item
                          )
                          setGeneralSettings({ ...generalSettings, social_links: next })
                        }}
                        className="col-span-4 border border-slate-300 bg-white rounded-lg px-2 py-1.5 text-xs font-bold"
                      >
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                        <option value="youtube">YouTube</option>
                        <option value="tiktok">TikTok</option>
                        <option value="x">X (Twitter)</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="other">Diğer</option>
                      </select>

                      <input
                        type="url"
                        placeholder="https://..."
                        value={soc.url || ''}
                        onChange={(e) => {
                          const next = arr.map((item, i) =>
                            i === idx ? { ...item, url: e.target.value } : item
                          )
                          setGeneralSettings({ ...generalSettings, social_links: next })
                        }}
                        className="col-span-7 border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const next = arr.filter((_, i) => i !== idx)
                          setGeneralSettings({ ...generalSettings, social_links: next })
                        }}
                        className="col-span-1 text-red-500 hover:bg-red-50 p-1.5 rounded-lg flex justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/admin', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'save_system_setting',
                        payload: { key: 'general_settings', value: generalSettings },
                      }),
                    })
                    alert('Sosyal medya hesapları kaydedildi!')
                  }}
                  className="bg-slate-900 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition"
                >
                  <Save className="w-4 h-4" />
                  Sosyal Medya Linklerini Kaydet
                </button>
              </div>

              {/* GOOGLE YORUMLARI YÖNETİCİSİ */}
              <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Google Yorumları Yönetimi</h3>
                    <p className="text-xs text-slate-500">
                      Google puanınızı ve öne çıkarmak istediğiniz müşteri yorumlarını buradan yönetin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const current = Array.isArray(generalSettings.google_reviews)
                        ? generalSettings.google_reviews
                        : []
                      setGeneralSettings({
                        ...generalSettings,
                        google_reviews: [
                          ...current,
                          { id: `rev-${Date.now()}`, author: '', rating: 5, dateText: 'Yeni', text: '' },
                        ],
                      })
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Yorum Ekle
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Google Puanı</label>
                    <input
                      type="text"
                      value={generalSettings.google_rating || '4.6'}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, google_rating: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Toplam Yorum</label>
                    <input
                      type="text"
                      value={generalSettings.google_review_count || '14'}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          google_review_count: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Google Maps Linki</label>
                    <input
                      type="text"
                      value={generalSettings.google_maps_url || 'https://maps.app.goo.gl/SWfPdg6TxhcJ2LYK9'}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          google_maps_url: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {(!Array.isArray(generalSettings.google_reviews) ||
                    generalSettings.google_reviews.length === 0) && (
                    <p className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3">
                      Henüz özel yorum eklenmedi (ön yüzde varsayılan 3 yorum gösteriliyor). Yukarıdan <strong>+ Yorum Ekle</strong> diyerek kendi yorumlarınızı girebilirsiniz.
                    </p>
                  )}
                  {(Array.isArray(generalSettings.google_reviews)
                    ? generalSettings.google_reviews
                    : []
                  ).map((rev: any, idx: number, arr: any[]) => (
                    <div
                      key={rev.id || idx}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2"
                    >
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Müşteri Adı (Örn: Ayşe K.)"
                          value={rev.author || ''}
                          onChange={(e) => {
                            const next = arr.map((r, i) =>
                              i === idx ? { ...r, author: e.target.value } : r
                            )
                            setGeneralSettings({ ...generalSettings, google_reviews: next })
                          }}
                          className="col-span-5 border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold"
                        />
                        <input
                          type="text"
                          placeholder="Tarih (Örn: 2 hafta önce)"
                          value={rev.dateText || ''}
                          onChange={(e) => {
                            const next = arr.map((r, i) =>
                              i === idx ? { ...r, dateText: e.target.value } : r
                            )
                            setGeneralSettings({ ...generalSettings, google_reviews: next })
                          }}
                          className="col-span-4 border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs"
                        />
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={rev.rating ?? 5}
                          onChange={(e) => {
                            const next = arr.map((r, i) =>
                              i === idx ? { ...r, rating: Number(e.target.value) } : r
                            )
                            setGeneralSettings({ ...generalSettings, google_reviews: next })
                          }}
                          className="col-span-2 border border-slate-300 bg-white rounded-lg px-2 py-1.5 text-xs font-bold text-center"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = arr.filter((_, i) => i !== idx)
                            setGeneralSettings({ ...generalSettings, google_reviews: next })
                          }}
                          className="col-span-1 text-red-500 flex justify-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Yorum metni..."
                        value={rev.text || ''}
                        onChange={(e) => {
                          const next = arr.map((r, i) =>
                            i === idx ? { ...r, text: e.target.value } : r
                          )
                          setGeneralSettings({ ...generalSettings, google_reviews: next })
                        }}
                        className="w-full border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/admin', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'save_system_setting',
                        payload: { key: 'general_settings', value: generalSettings },
                      }),
                    })
                    alert('Google yorumları kaydedildi!')
                  }}
                  className="bg-slate-900 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition"
                >
                  <Save className="w-4 h-4" />
                  Google Yorumlarını Kaydet
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: ÜRÜN DÜZENLEME */}
      {editingPkg && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSavePackageModal}
            className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-xl font-extrabold text-slate-900">
                {editingPkg.id ? `${editingPkg.title} — Düzenle` : 'Yeni Diyet Paketi Oluştur'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPkg(null)}
                className="p-2 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Paket Adı</label>
                <input
                  type="text"
                  required
                  value={editingPkg.title}
                  onChange={(e) => setEditingPkg({ ...editingPkg, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                <select
                  value={editingPkg.category || 'Diyet Paketleri'}
                  onChange={(e) => setEditingPkg({ ...editingPkg, category: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                >
                  <option value="Diyet Paketleri">Diyet Paketleri</option>
                  <option value="Detoks Paketleri">Detoks Paketleri</option>
                  <option value="Sporcu Paketleri">Sporcu Paketleri</option>
                  <option value="Ofis Paketleri">Ofis Paketleri</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vitrin Başlangıç / Günlük Baz Fiyatı (TL)
                </label>
                <input
                  type="number"
                  required
                  value={editingPkg.daily_base_price}
                  onChange={(e) =>
                    setEditingPkg({ ...editingPkg, daily_base_price: Number(e.target.value) })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kalori Aralığı</label>
                <input
                  type="text"
                  value={editingPkg.calories_range || ''}
                  onChange={(e) => setEditingPkg({ ...editingPkg, calories_range: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Öğün Sayısı</label>
                <input
                  type="text"
                  value={editingPkg.meal_count_text || ''}
                  onChange={(e) =>
                    setEditingPkg({ ...editingPkg, meal_count_text: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-3 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Paket Kapak Görseli (Bilgisayardan Yükle veya URL Gir)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {editingPkg.cover_image && (
                    <img
                      src={editingPkg.cover_image}
                      alt="Önizleme"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-300 shrink-0"
                    />
                  )}
                  <input
                    type="text"
                    placeholder="Görsel URL veya sağdaki butondan bilgisayarınızdan yükleyin"
                    value={editingPkg.cover_image || ''}
                    onChange={(e) => setEditingPkg({ ...editingPkg, cover_image: e.target.value })}
                    className="flex-1 w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs"
                  />
                  <label className="bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shrink-0 transition">
                    Bilgisayardan Resim Seç
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const fd = new FormData()
                        fd.append('file', file)
                        const res = await fetch('/api/upload', { method: 'POST', body: fd })
                        const data = await res.json()
                        if (res.ok && data.url) {
                          setEditingPkg({ ...editingPkg, cover_image: data.url })
                        } else {
                          alert(data.error || 'Görsel yüklenemedi')
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kısa Açıklama
                </label>
                <textarea
                  rows={2}
                  value={editingPkg.short_description || ''}
                  onChange={(e) =>
                    setEditingPkg({ ...editingPkg, short_description: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs"
                />
              </div>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-emerald-950 text-sm">
                    Gün Periyoduna Göre Bağımsız Paket Fiyatları
                  </h4>
                  <p className="text-xs text-emerald-800">
                    Her seçeneğin başlığını, gün sayısını ve toplam fiyatını bağımsız değiştirebilirsiniz.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = [
                      ...(editingPkg.custom_duration_prices || []),
                      {
                        days: 5,
                        label: '5 Günlük Paket',
                        total_price: editingPkg.daily_base_price * 5,
                      },
                    ]
                    setEditingPkg({ ...editingPkg, custom_duration_prices: next })
                  }}
                  className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  + Yeni Seçenek / Periyot Ekle
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(editingPkg.custom_duration_prices || []).map((tier: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-white p-3 rounded-xl border border-emerald-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500">
                        Seçenek #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = editingPkg.custom_duration_prices.filter(
                            (_: any, i: number) => i !== idx
                          )
                          setEditingPkg({ ...editingPkg, custom_duration_prices: next })
                        }}
                        className="text-red-500 text-xs font-bold"
                      >
                        Kaldır
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400">Görünür Etiket</label>
                      <input
                        type="text"
                        value={tier.label || ''}
                        onChange={(e) => {
                          const next = [...editingPkg.custom_duration_prices]
                          next[idx].label = e.target.value
                          setEditingPkg({ ...editingPkg, custom_duration_prices: next })
                        }}
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400">Gün Sayısı</label>
                        <input
                          type="number"
                          value={tier.days}
                          onChange={(e) => {
                            const next = [...editingPkg.custom_duration_prices]
                            next[idx].days = Number(e.target.value)
                            setEditingPkg({ ...editingPkg, custom_duration_prices: next })
                          }}
                          className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">Toplam Fiyat (TL)</label>
                        <input
                          type="number"
                          value={tier.total_price}
                          onChange={(e) => {
                            const next = [...editingPkg.custom_duration_prices]
                            next[idx].total_price = Number(e.target.value)
                            setEditingPkg({ ...editingPkg, custom_duration_prices: next })
                          }}
                          className="w-full border border-emerald-400 rounded-lg px-2 py-1 text-xs font-extrabold text-emerald-800"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-sm">Örnek Menü İçeriği</h4>
                <button
                  type="button"
                  onClick={() => {
                    const nextMenu = [...(editingPkg.sample_menu_table || [])]
                    if (nextMenu.length === 0) {
                      nextMenu.push({ day: 'Örnek Günlük Menü', meals: [] })
                    }
                    nextMenu[0].meals.push({ title: 'Yeni Öğün', desc: '', kcal: '' })
                    setEditingPkg({ ...editingPkg, sample_menu_table: nextMenu })
                  }}
                  className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  + Öğün Satırı Ekle
                </button>
              </div>

              {(editingPkg.sample_menu_table?.[0]?.meals || []).map((meal: any, mIdx: number) => (
                <div key={mIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Öğün (Sabah / Öğle)"
                    value={meal.title}
                    onChange={(e) => {
                      const nextMenu = [...editingPkg.sample_menu_table]
                      nextMenu[0].meals[mIdx].title = e.target.value
                      setEditingPkg({ ...editingPkg, sample_menu_table: nextMenu })
                    }}
                    className="sm:col-span-3 border border-slate-300 bg-white rounded-lg px-3 py-1.5 text-xs font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Menü İçeriği"
                    value={meal.desc}
                    onChange={(e) => {
                      const nextMenu = [...editingPkg.sample_menu_table]
                      nextMenu[0].meals[mIdx].desc = e.target.value
                      setEditingPkg({ ...editingPkg, sample_menu_table: nextMenu })
                    }}
                    className="sm:col-span-8 border border-slate-300 bg-white rounded-lg px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nextMenu = [...editingPkg.sample_menu_table]
                      nextMenu[0].meals.splice(mIdx, 1)
                      setEditingPkg({ ...editingPkg, sample_menu_table: nextMenu })
                    }}
                    className="sm:col-span-1 text-red-500 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingPkg(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Paketi Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: SLIDER EKLEME / DÜZENLEME */}
      {editingSlide && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'save_slider',
                  payload: editingSlide,
                }),
              })
              setEditingSlide(null)
              fetchAllData()
            }}
            className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-slate-900">
                {editingSlide.id ? 'Slaytı Düzenle' : 'Yeni Slayt Ekle'}
              </h3>
              <button type="button" onClick={() => setEditingSlide(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Üst Rozet</label>
                <input
                  type="text"
                  value={editingSlide.badge_text || ''}
                  onChange={(e) =>
                    setEditingSlide({ ...editingSlide, badge_text: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sarı Fiyat Vurgusu
                </label>
                <input
                  type="text"
                  value={editingSlide.price_highlight || ''}
                  onChange={(e) =>
                    setEditingSlide({ ...editingSlide, price_highlight: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ana Başlık</label>
              <input
                type="text"
                required
                value={editingSlide.title}
                onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alt Açıklama</label>
              <textarea
                rows={2}
                value={editingSlide.subtitle || ''}
                onChange={(e) => setEditingSlide({ ...editingSlide, subtitle: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Medya Türü</label>
                <select
                  value={editingSlide.media_type}
                  onChange={(e) =>
                    setEditingSlide({ ...editingSlide, media_type: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="image">Fotoğraf / Görsel</option>
                  <option value="video">MP4 Video</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Buton Linki</label>
                <input
                  type="text"
                  value={editingSlide.button_url || ''}
                  onChange={(e) =>
                    setEditingSlide({ ...editingSlide, button_url: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Görsel / Video URL veya Bilgisayardan Yükle
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={editingSlide.media_url || ''}
                  onChange={(e) => setEditingSlide({ ...editingSlide, media_url: e.target.value })}
                  className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
                <label className="bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer shrink-0">
                  Dosya Seç
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const fd = new FormData()
                      fd.append('file', file)
                      const res = await fetch('/api/upload', { method: 'POST', body: fd })
                      const data = await res.json()
                      if (res.ok && data.url) {
                        setEditingSlide({ ...editingSlide, media_url: data.url })
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSlide(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              >
                İptal
              </button>
              <button
                type="submit"
                className="bg-emerald-600 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer"
              >
                Slaytı Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: MAHALLE DÜZENLEME */}
      {editingNeigh && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'save_neighborhood_full',
                  payload: editingNeigh,
                }),
              })
              setEditingNeigh(null)
              fetchAllData()
            }}
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-slate-900">Mahalle Lojistik Ayarları</h3>
              <button type="button" onClick={() => setEditingNeigh(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mahalle Adı</label>
              <input
                type="text"
                required
                value={editingNeigh.name}
                onChange={(e) => setEditingNeigh({ ...editingNeigh, name: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teslimat Saati / Bilgi Notu
              </label>
              <input
                type="text"
                value={editingNeigh.delivery_time_note || ''}
                onChange={(e) =>
                  setEditingNeigh({ ...editingNeigh, delivery_time_note: e.target.value })
                }
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Günlük Ek Lojistik Ücreti (TL)
              </label>
              <input
                type="number"
                value={editingNeigh.custom_daily_fee ?? 0}
                onChange={(e) => {
                  const daily = Number(e.target.value)
                  setEditingNeigh({
                    ...editingNeigh,
                    custom_daily_fee: daily,
                    period_fees: {
                      '5': daily * 5,
                      '10': daily * 10,
                      '14': daily * 14,
                      '20': daily * 20,
                      '30': daily * 30,
                    },
                  })
                }}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingNeigh(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              >
                İptal
              </button>
              <button
                type="submit"
                className="bg-emerald-600 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer"
              >
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: MÜŞTERİ DETAY, SİPARİŞ GEÇMİŞİ VE GEZİNME LOGLARI */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Müşteri Kartı (CRM)
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1.5">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-500">
                  {selectedCustomer.phone} • {selectedCustomer.email || 'E-posta yok'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-2 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Özet Bilgiler */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-slate-400 font-bold block">Toplam Harcama</span>
                <strong className="text-lg font-black text-emerald-700">
                  {formatTRY(selectedCustomer.totalSpent)}
                </strong>
                <span className="block text-slate-500">{selectedCustomer.orderCount} Sipariş</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-slate-400 font-bold block">Boy / Kilo</span>
                <strong className="text-base font-extrabold text-slate-900">
                  {selectedCustomer.height || '-'} cm / {selectedCustomer.weight || '-'} kg
                </strong>
                <span className="block text-red-600 mt-0.5">
                  Not: {selectedCustomer.notes || 'Yok'}
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-slate-400 font-bold block">Teslimat Adresi</span>
                <strong className="text-slate-900 block">
                  {selectedCustomer.district} / {selectedCustomer.neighborhood}
                </strong>
                <span className="text-slate-500 line-clamp-2">{selectedCustomer.address}</span>
              </div>
            </div>

            {/* Müşterinin Tüm Siparişleri */}
            <div className="space-y-2.5">
              <h4 className="font-extrabold text-slate-900 text-sm">Sipariş Geçmişi</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs">
                {orders
                  .filter(
                    (o) =>
                      (selectedCustomer.phone &&
                        selectedCustomer.phone !== '-' &&
                        o.customer_phone === selectedCustomer.phone) ||
                      (selectedCustomer.email &&
                        o.customer_email?.toLowerCase() === selectedCustomer.email.toLowerCase())
                  )
                  .map((o) => (
                    <div
                      key={o.id}
                      className="p-3.5 flex flex-wrap items-center justify-between gap-2 bg-white"
                    >
                      <div>
                        <strong className="text-slate-900">
                          {o.order_number} — {o.package_title} ({o.duration_days} Gün)
                        </strong>
                        <span className="block text-slate-500">
                          Başlangıç: {o.start_date} • Bitiş: {o.estimated_end_date} • Durum:{' '}
                          {o.status}
                        </span>
                      </div>
                      <strong className="text-emerald-700 font-extrabold">
                        {formatTRY(o.grand_total)}
                      </strong>
                    </div>
                  ))}
                {orders.filter(
                  (o) =>
                    (selectedCustomer.phone &&
                      selectedCustomer.phone !== '-' &&
                      o.customer_phone === selectedCustomer.phone) ||
                    (selectedCustomer.email &&
                      o.customer_email?.toLowerCase() === selectedCustomer.email.toLowerCase())
                ).length === 0 && (
                  <p className="p-4 text-slate-400 text-center">
                    Bu üyenin henüz tamamlanmış siparişi bulunmuyor.
                  </p>
                )}
              </div>
            </div>

            {/* Müşterinin Site Gezinme / Aktivite Logları */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Son İncelediği Sayfalar &amp; Aktivite Geçmişi
                </h4>
                {selectedCustomer.email && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogFilter(selectedCustomer.email)
                      setSelectedCustomer(null)
                      setActiveSection('logs')
                    }}
                    className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Tüm Loglarda Filtrele &rarr;
                  </button>
                )}
              </div>

              <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-56 overflow-y-auto text-xs">
                {activityLogs
                  .filter(
                    (l) =>
                      selectedCustomer.email &&
                      l.customer_email?.toLowerCase() === selectedCustomer.email.toLowerCase()
                  )
                  .slice(0, 20)
                  .map((log) => (
                    <div key={log.id} className="p-3 flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800">{log.path}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(log.created_at).toLocaleString('tr-TR')}
                      </span>
                    </div>
                  ))}
                {(!selectedCustomer.email ||
                  activityLogs.filter(
                    (l) =>
                      l.customer_email?.toLowerCase() === selectedCustomer.email.toLowerCase()
                  ).length === 0) && (
                  <p className="p-4 text-slate-400 text-center">
                    Bu müşteri için henüz kayıtlı gezinme logu bulunmuyor.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}