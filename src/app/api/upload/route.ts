// src/app/api/upload/route.ts
import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Dosya seçilmedi.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Dosya adını güvenli hale getir
    const ext = path.extname(file.name) || '.jpg'
    const baseName = path
      .basename(file.name, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const fileName = `${baseName}-${Date.now()}${ext}`

    // 1. Önce Supabase Storage 'uploads' bucket'ına yüklemeyi dene
    try {
      const supabase = createAdminClient()
      const { error: uploadErr } = await supabase.storage
        .from('uploads')
        .upload(`packages/${fileName}`, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        })

      if (!uploadErr) {
        const { data: pubUrl } = supabase.storage
          .from('uploads')
          .getPublicUrl(`packages/${fileName}`)

        if (pubUrl?.publicUrl) {
          return NextResponse.json({ url: pubUrl.publicUrl })
        }
      }
    } catch {
      // Supabase Storage kapalıysa yerel klasöre devam et
    }

    // 2. Yerel bilgisayar (public/uploads) kaydı — Localhost'ta %100 kesintisiz çalışır
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    return NextResponse.json({ url: `/uploads/${fileName}` })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Görsel yüklenemedi.' },
      { status: 500 }
    )
  }
}