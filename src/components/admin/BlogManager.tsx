// src/components/admin/BlogManager.tsx
'use client'

import { useEffect, useState } from 'react'
import RichTextEditor from '@/components/RichTextEditor'
import {
  Plus,
  Save,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Upload,
  Loader2,
  ExternalLink,
  Tag,
  Search,
} from 'lucide-react'

function slugifyTR(text: string) {
  return String(text || '')
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

const EMPTY_POST = {
  id: null as number | null,
  title: '',
  slug: '',
  category_id: '',
  excerpt: '',
  content: '',
  cover_image: '',
  status: 'published' as 'published' | 'draft',
  meta_title: '',
  meta_description: '',
  published_at: null as string | null,
}

export default function BlogManager() {
  const [posts, setPosts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState(EMPTY_POST)
  const [newCatName, setNewCatName] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/blog', { cache: 'no-store' })
      const data = await res.json()
      setPosts(data.posts || [])
      setCategories(data.categories || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.url) {
        setForm((prev) => ({ ...prev, cover_image: data.url }))
      } else {
        alert(data.error || 'Kapak görseli yüklenemedi.')
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'save_post', payload: form }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Yazı kaydedilemedi.')
        return
      }
      alert(form.id ? 'Blog yazısı güncellendi!' : 'Yeni blog yazısı kaydedildi!')
      setForm(EMPTY_POST)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    const res = await fetch('/api/blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'save_category',
        payload: { name: newCatName.trim(), sort_order: categories.length + 1 },
      }),
    })
    if (res.ok) {
      setNewCatName('')
      load()
    }
  }

  const filteredPosts = posts.filter((p) =>
    filterStatus === 'all' ? true : p.status === filterStatus
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SOL: YAZI EKLEME / DÜZENLEME FORMU */}
        <form
          onSubmit={handleSavePost}
          className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900">
              {form.id ? 'Blog Yazısını Düzenle' : 'Yeni Blog Yazısı Ekle'}
            </h3>
            {form.id && (
              <button
                type="button"
                onClick={() => setForm(EMPTY_POST)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                + Yeni Yazı Moduna Geç
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Yazı Başlığı *</label>
            <input
              type="text"
              required
              placeholder="Örn: Aralıklı Oruç (Intermittent Fasting) Nasıl Yapılır?"
              value={form.title}
              onChange={(e) => {
                const title = e.target.value
                setForm({
                  ...form,
                  title,
                  slug: form.id ? form.slug : slugifyTR(title),
                })
              }}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">URL (Slug)</label>
              <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                <span className="px-2 text-[11px] text-slate-500 font-semibold border-r border-slate-200">
                  /blog/
                </span>
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugifyTR(e.target.value) })}
                  className="flex-1 bg-white px-2 py-2 text-xs font-mono focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
              >
                <option value="">-- Kategori Seçin --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Yayın Durumu</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value="published">Yayında (Sitede Görünür)</option>
                <option value="draft">Taslak (Gizli)</option>
              </select>
            </div>
          </div>

          {/* KAPAK GÖRSELİ */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Kapak Görseli</label>
            <div className="flex flex-wrap items-center gap-2">
              {form.cover_image && (
                <img
                  src={form.cover_image}
                  alt="Kapak"
                  className="w-16 h-12 rounded-lg object-cover border border-slate-200"
                />
              )}
              <input
                type="text"
                placeholder="Görsel URL veya bilgisayardan yükleyin"
                value={form.cover_image}
                onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs"
              />
              <label className="bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer inline-flex items-center gap-1.5 shrink-0 transition">
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                {uploading ? 'Yükleniyor...' : 'Kapak Yükle'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleCoverUpload}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kısa Özet (Kartlarda Görünür)
            </label>
            <textarea
              rows={2}
              placeholder="Yazının 1-2 cümlelik özeti..."
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Yazı İçeriği</label>
            <RichTextEditor
              value={form.content}
              onChange={(html) => setForm({ ...form, content: html })}
            />
          </div>

          {/* SEO META ALANLARI */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
              <Search className="w-3.5 h-3.5 text-emerald-600" />
              SEO Ayarları (Google Arama Görünümü)
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Meta Title (Boş bırakılırsa yazı başlığı kullanılır)
              </label>
              <input
                type="text"
                maxLength={70}
                placeholder="Örn: Aralıklı Oruç Nedir? Diyetisyen Rehberi | DietBox"
                value={form.meta_title}
                onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Meta Description (150-160 karakter ideal)
              </label>
              <textarea
                rows={2}
                maxLength={170}
                placeholder="Google arama sonuçlarında başlığın altında çıkacak açıklama..."
                value={form.meta_description}
                onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs inline-flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Kaydediliyor...' : form.id ? 'Yazıyı Güncelle' : 'Yazıyı Kaydet'}
          </button>
        </form>

        {/* SAĞ: KATEGORİ YÖNETİMİ */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-emerald-600" />
              Blog Kategorileri ({categories.length})
            </h3>
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="Yeni kategori adı..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Ekle
              </button>
            </form>
            <div className="divide-y divide-slate-100 text-xs">
              {categories.map((cat) => (
                <div key={cat.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <strong className="text-slate-800 block">{cat.name}</strong>
                    <span className="text-[11px] text-slate-400">/{cat.slug}</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`"${cat.name}" kategorisini silmek istediğinize emin misiniz?`))
                        return
                      await fetch('/api/blog', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'delete_category', payload: { id: cat.id } }),
                      })
                      load()
                    }}
                    className="text-red-500 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 space-y-1.5">
            <strong className="block">SEO &amp; Sitemap Bilgisi</strong>
            <p className="text-emerald-800 leading-relaxed">
              <strong>Yayında</strong> durumundaki tüm blog yazıları otomatik olarak{' '}
              <code>/sitemap.xml</code> dosyasına eklenir; <strong>Taslak</strong> yazılar sitede ve
              Google haritasında gizli kalır.
            </p>
          </div>
        </div>
      </div>

      {/* ALT: KAYITLI BLOG YAZILARI LİSTESİ */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-extrabold text-slate-900">
            Blog Yazıları ({filteredPosts.length})
          </h3>
          <div className="flex items-center gap-2">
            {(['all', 'published', 'draft'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  filterStatus === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all' ? 'Tümü' : st === 'published' ? 'Yayında' : 'Taslak'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Yükleniyor...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Henüz blog yazısı bulunmuyor.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="py-3.5 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  {post.cover_image ? (
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="w-16 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-12 rounded-xl bg-slate-100 border border-slate-200 shrink-0" />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-bold text-slate-900">{post.title}</strong>
                      {post.blog_categories?.name && (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                          {post.blog_categories.name}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">/blog/{post.slug}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {post.status === 'published' && (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-600"
                      title="Yazıyı Gör"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch('/api/blog', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          type: 'toggle_status',
                          payload: { id: post.id, status: post.status },
                        }),
                      })
                      load()
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                      post.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {post.status === 'published' ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    {post.status === 'published' ? 'Yayında' : 'Taslak'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm({
                        id: post.id,
                        title: post.title || '',
                        slug: post.slug || '',
                        category_id: post.category_id ? String(post.category_id) : '',
                        excerpt: post.excerpt || '',
                        content: post.content || '',
                        cover_image: post.cover_image || '',
                        status: post.status || 'draft',
                        meta_title: post.meta_title || '',
                        meta_description: post.meta_description || '',
                        published_at: post.published_at || null,
                      })
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`"${post.title}" yazısını silmek istediğinize emin misiniz?`))
                        return
                      await fetch('/api/blog', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'delete_post', payload: { id: post.id } }),
                      })
                      load()
                    }}
                    className="text-red-500 p-1.5 cursor-pointer"
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