// src/components/RichTextEditor.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Quote,
  RemoveFormatting,
  Pilcrow,
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Sayfa içeriğini buraya yazın...',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [htmlMode, setHtmlMode] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Dışarıdan gelen değer (ör. Düzenle'ye basıldığında) editöre senkronize edilir
  useEffect(() => {
    if (!htmlMode && editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value, htmlMode])

  const runCommand = (cmd: string, arg?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, arg)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleInsertLink = () => {
    const url = prompt('Eklemek istediğiniz bağlantı (URL) adresini girin:', 'https://')
    if (url && url.trim()) {
      runCommand('createLink', url.trim())
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.url) {
        const imgHtml = `<p><img src="${data.url}" alt="DietBox" style="max-width:100%;border-radius:12px;margin:12px 0;" /></p>`
        runCommand('insertHTML', imgHtml)
      } else {
        alert(data.error || 'Görsel yüklenemedi.')
      }
    } catch {
      alert('Görsel yükleme sırasında hata oluştu.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const btnClass =
    'p-1.5 rounded-lg text-slate-700 hover:bg-slate-200/80 hover:text-slate-950 transition cursor-pointer flex items-center justify-center'

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white focus-within:border-emerald-500 transition">
      {/* Üst Araç Çubuğu */}
      <div className="bg-slate-50 border-b border-slate-200 px-2.5 py-2 flex flex-wrap items-center gap-1">
        <button
          type="button"
          title="Ana Başlık (H2)"
          onClick={() => runCommand('formatBlock', '<h2>')}
          className={btnClass}
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Alt Başlık (H3)"
          onClick={() => runCommand('formatBlock', '<h3>')}
          className={btnClass}
        >
          <Heading3 className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Normal Paragraf"
          onClick={() => runCommand('formatBlock', '<p>')}
          className={btnClass}
        >
          <Pilcrow className="w-4 h-4" />
        </button>

        <span className="w-[1px] h-5 bg-slate-300 mx-1" />

        <button
          type="button"
          title="Kalın (Bold)"
          onClick={() => runCommand('bold')}
          className={btnClass}
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="İtalik"
          onClick={() => runCommand('italic')}
          className={btnClass}
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Altı Çizili"
          onClick={() => runCommand('underline')}
          className={btnClass}
        >
          <Underline className="w-4 h-4" />
        </button>

        <span className="w-[1px] h-5 bg-slate-300 mx-1" />

        <button
          type="button"
          title="Madde İşaretli Liste"
          onClick={() => runCommand('insertUnorderedList')}
          className={btnClass}
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Numaralı Liste"
          onClick={() => runCommand('insertOrderedList')}
          className={btnClass}
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Alıntı"
          onClick={() => runCommand('formatBlock', '<blockquote>')}
          className={btnClass}
        >
          <Quote className="w-4 h-4" />
        </button>

        <span className="w-[1px] h-5 bg-slate-300 mx-1" />

        <button
          type="button"
          title="Bağlantı (Link) Ekle"
          onClick={handleInsertLink}
          className={btnClass}
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        <label
          title="Bilgisayardan Görsel Yükle"
          className={`${btnClass} ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <ImageIcon className="w-4 h-4 text-emerald-700" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </label>

        <button
          type="button"
          title="Biçimlendirmeyi Temizle"
          onClick={() => runCommand('removeFormat')}
          className={btnClass}
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>

        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setHtmlMode((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition ${
              htmlMode
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            {htmlMode ? 'Görsel Mod' : 'HTML'}
          </button>
        </div>
      </div>

      {/* Editör İçerik Alanı */}
      {htmlMode ? (
        <textarea
          rows={12}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="<p>HTML içeriğinizi buraya yazabilirsiniz...</p>"
          className="w-full p-3.5 text-xs font-mono text-slate-800 focus:outline-none bg-slate-50/50"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
          data-placeholder={placeholder}
          className="min-h-[260px] max-h-[520px] overflow-y-auto p-4 text-sm text-slate-800 leading-relaxed focus:outline-none [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_a]:text-emerald-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_p]:mb-2"
        />
      )}

      {uploading && (
        <div className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-3 py-1.5 border-t border-emerald-100">
          Görsel yükleniyor...
        </div>
      )}
    </div>
  )
}