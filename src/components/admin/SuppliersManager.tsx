// src/components/admin/SuppliersManager.tsx
'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Eye, EyeOff, Upload, Loader2 } from 'lucide-react'

export default function SuppliersManager() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [updatingLogoId, setUpdatingLogoId] = useState<number | null>(null)

  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [category, setCategory] = useState('')
  const [sortOrder, setSortOrder] = useState('18')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/suppliers', { cache: 'no-store' })
      const data = await res.json()
      const list = data.suppliers || []
      setItems(list)
      setSortOrder(String(list.length + 1))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const uploadFile = async (file: File): Promise<string | null> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok || !data.url) {
      alert(data.error || 'Logo yüklenemedi.')
      return null
    }
    return data.url
  }

  const handleNewLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file)
      if (url) setLogoUrl(url)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleReplaceLogo = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUpdatingLogoId(id)
    try {
      const url = await uploadFile(file)
      if (url) {
        await fetch('/api/suppliers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, logo_url: url }),
        })
        load()
      }
    } finally {
      setUpdatingLogoId(null)
      e.target.value = ''
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !logoUrl.trim()) {
      alert('Lütfen marka adını girin ve bir logo yükleyin.')
      return
    }

    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        logo_url: logoUrl.trim(),
        category: category.trim() || 'Gıda Tedarikçisi',
        sort_order: Number(sortOrder) || items.length + 1,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      alert(data.error || 'Tedarikçi eklenemedi')
      return
    }
    setName('')
    setLogoUrl('')
    setCategory('')
    load()
  }

  const toggleActive = async (item: any) => {
    await fetch('/api/suppliers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
    })
    load()
  }

  const updateOrder = async (id: number, newOrder: number) => {
    await fetch('/api/suppliers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, sort_order: newOrder }),
    })
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu tedarikçiyi silmek istediğinize emin misiniz?')) return
    await fetch(`/api/suppliers?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-6">
      {/* YENİ TEDARİKÇİ EKLEME FORMU */}
      <form
        onSubmit={handleAdd}
        className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-600 mb-1">Marka Adı</label>
            <input
              type="text"
              required
              placeholder="Örn: Pınar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-600 mb-1">Kategori</label>
            <input
              type="text"
              placeholder="Süt Ürünleri"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-600 mb-1">Sıra</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs"
            />
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Marka Logosu (Bilgisayardan Yükle veya URL)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                placeholder="Logo yükleyin veya URL girin..."
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs"
              />
              <label className="bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer inline-flex items-center gap-1.5 shrink-0 transition">
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                {uploading ? 'Yükleniyor...' : 'Logo Yükle'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleNewLogoUpload}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <>
                <div className="w-20 h-12 bg-slate-50 border border-slate-200 rounded-xl p-1.5 flex items-center justify-center">
                  <img
                    src={logoUrl}
                    alt="Önizleme"
                    className="max-h-9 max-w-full object-contain"
                  />
                </div>
                <span className="text-[11px] font-semibold text-emerald-700">
                  Logo hazır, kaydedebilirsiniz.
                </span>
              </>
            ) : (
              <span className="text-[11px] text-slate-400">
                PNG, JPG veya WebP formatında logo yükleyebilirsiniz.
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="bg-[#51a885] hover:bg-[#3f8d6d] disabled:opacity-50 text-white font-bold text-xs py-2.5 px-5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" /> Tedarikçi Ekle
          </button>
        </div>
      </form>

      {/* MEVCUT TEDARİKÇİLER LİSTESİ */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Yükleniyor...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Kayıtlı tedarikçi bulunamadı.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-20 h-12 bg-white border border-slate-200 rounded-xl p-1.5 flex items-center justify-center">
                    <img
                      src={item.logo_url}
                      alt={item.name}
                      className="max-h-9 max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <strong className="text-sm font-bold text-slate-900 block">{item.name}</strong>
                    <span className="text-xs text-slate-500">{item.category}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition">
                    {updatingLogoId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    {updatingLogoId === item.id ? 'Yükleniyor...' : 'Logo Değiştir'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={updatingLogoId === item.id}
                      onChange={(e) => handleReplaceLogo(item.id, e)}
                    />
                  </label>

                  <input
                    type="number"
                    defaultValue={item.sort_order}
                    onBlur={(e) => updateOrder(item.id, Number(e.target.value))}
                    className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center"
                    title="Sıra Numarası"
                  />

                  <button
                    type="button"
                    onClick={() => toggleActive(item)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                      item.is_active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.is_active ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    {item.is_active ? 'Aktif' : 'Gizli'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}