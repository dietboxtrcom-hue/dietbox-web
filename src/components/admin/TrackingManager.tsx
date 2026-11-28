// src/components/admin/TrackingManager.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3,
  Search,
  Save,
  CheckCircle2,
  CircleDashed,
  ShieldCheck,
  Code2,
  MousePointerClick,
  Activity,
} from 'lucide-react'

function extractGscCode(raw: string): string {
  const trimmed = (raw || '').trim()
  const match = trimmed.match(/content=["']([^"']+)["']/i)
  return match ? match[1].trim() : trimmed
}

export default function TrackingManager() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    is_enabled: true,
    gsc_verification: '',
    ga4_id: '',
    gtm_id: '',
    meta_pixel_id: '',
    google_ads_id: '',
    clarity_id: '',
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'tracking_config')
        .single()

      if (data?.value) {
        setConfig((prev) => ({ ...prev, ...data.value }))
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const cleaned = {
        ...config,
        gsc_verification: extractGscCode(config.gsc_verification),
        ga4_id: config.ga4_id.trim(),
        gtm_id: config.gtm_id.trim(),
        meta_pixel_id: config.meta_pixel_id.trim(),
        google_ads_id: config.google_ads_id.trim(),
        clarity_id: config.clarity_id.trim(),
      }
      setConfig(cleaned)

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_system_setting',
          payload: { key: 'tracking_config', value: cleaned },
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Kaydedilirken hata oluştu.')
        return
      }
      alert('SEO, Analitik ve Piksel entegrasyonları kaydedildi!')
    } finally {
      setSaving(false)
    }
  }

  const activeCount = [
    config.gsc_verification,
    config.ga4_id,
    config.gtm_id,
    config.meta_pixel_id,
    config.google_ads_id,
    config.clarity_id,
  ].filter((v) => v && v.trim().length > 0).length

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-xs text-slate-500">
        Entegrasyon ayarları yükleniyor...
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* ÜST ÖZET & ANA ŞALTER */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900">
              Site Kit — SEO, Analitik &amp; Reklam Pikselleri
            </h2>
            <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {activeCount} Aktif Entegrasyon
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kod değişikliği veya yeniden yayınlama (deploy) gerekmeden tüm Google ve Meta takip
            kimliklerini buradan yönetebilirsiniz. Admin ve kurye ekranları otomatik hariç tutulur.
          </p>
        </div>

        <label className="inline-flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={config.is_enabled}
            onChange={(e) => setConfig({ ...config, is_enabled: e.target.checked })}
            className="w-4 h-4 accent-emerald-600"
          />
          <span className="text-xs font-extrabold text-slate-800">
            Takip Kodları Sitede Aktif
          </span>
        </label>
      </div>

      {/* SERVİS KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. GOOGLE SEARCH CONSOLE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Google Search Console</h3>
                <span className="text-[11px] text-slate-500">HTML Etiketi Doğrulaması</span>
              </div>
            </div>
            {config.gsc_verification.trim() ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Bağlı
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                <CircleDashed className="w-3.5 h-3.5" /> Pasif
              </span>
            )}
          </div>

          <input
            type="text"
            placeholder="Doğrulama kodu veya <meta name=...> etiketini direkt yapıştırın"
            value={config.gsc_verification}
            onChange={(e) => setConfig({ ...config, gsc_verification: e.target.value })}
            onBlur={(e) =>
              setConfig({ ...config, gsc_verification: extractGscCode(e.target.value) })
            }
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono"
          />
        </div>

        {/* 2. GOOGLE ANALYTICS 4 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Google Analytics 4 (GA4)</h3>
                <span className="text-[11px] text-slate-500">Ölçüm Kimliği (Measurement ID)</span>
              </div>
            </div>
            {config.ga4_id.trim() ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Bağlı
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                <CircleDashed className="w-3.5 h-3.5" /> Pasif
              </span>
            )}
          </div>

          <input
            type="text"
            placeholder="Örn: G-XXXXXXXXXX"
            value={config.ga4_id}
            onChange={(e) => setConfig({ ...config, ga4_id: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono"
          />
        </div>

        {/* 3. META PIXEL */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <MousePointerClick className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Meta Pixel (Instagram / Facebook)
                </h3>
                <span className="text-[11px] text-slate-500">Veri Kümesi / Piksel ID</span>
              </div>
            </div>
            {config.meta_pixel_id.trim() ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Bağlı
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                <CircleDashed className="w-3.5 h-3.5" /> Pasif
              </span>
            )}
          </div>

          <input
            type="text"
            placeholder="Örn: 123456789012345"
            value={config.meta_pixel_id}
            onChange={(e) => setConfig({ ...config, meta_pixel_id: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono"
          />
        </div>

        {/* 4. GOOGLE TAG MANAGER */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Google Tag Manager (GTM)</h3>
                <span className="text-[11px] text-slate-500">Kapsayıcı Kimliği (Container ID)</span>
              </div>
            </div>
            {config.gtm_id.trim() ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Bağlı
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                <CircleDashed className="w-3.5 h-3.5" /> Pasif
              </span>
            )}
          </div>

          <input
            type="text"
            placeholder="Örn: GTM-XXXXXXX"
            value={config.gtm_id}
            onChange={(e) => setConfig({ ...config, gtm_id: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono"
          />
        </div>

        {/* 5. GOOGLE ADS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Google Ads Dönüşüm Etiketi</h3>
                <span className="text-[11px] text-slate-500">Google Ads Etiket Kimliği</span>
              </div>
            </div>
            {config.google_ads_id.trim() ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Bağlı
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                <CircleDashed className="w-3.5 h-3.5" /> Pasif
              </span>
            )}
          </div>

          <input
            type="text"
            placeholder="Örn: AW-123456789"
            value={config.google_ads_id}
            onChange={(e) => setConfig({ ...config, google_ads_id: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono"
          />
        </div>

        {/* 6. MICROSOFT CLARITY */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Microsoft Clarity</h3>
                <span className="text-[11px] text-slate-500">Ücretsiz Isı Haritası &amp; Oturum Kaydı</span>
              </div>
            </div>
            {config.clarity_id.trim() ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Bağlı
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                <CircleDashed className="w-3.5 h-3.5" /> Pasif
              </span>
            )}
          </div>

          <input
            type="text"
            placeholder="Örn: k9x2abc123"
            value={config.clarity_id}
            onChange={(e) => setConfig({ ...config, clarity_id: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold px-6 py-3 rounded-xl text-xs inline-flex items-center gap-2 shadow-sm cursor-pointer transition"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Kaydediliyor...' : 'Tüm Entegrasyonları Kaydet'}
        </button>
      </div>
    </form>
  )
}