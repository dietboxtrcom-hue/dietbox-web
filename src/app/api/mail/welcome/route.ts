// src/app/api/mail/welcome/route.ts
import { NextResponse } from 'next/server'
import { sendWelcomeEmails } from '@/lib/mailer'

export async function POST(request: Request) {
  try {
    const { fullName, email, phone } = await request.json()
    if (email) {
      await sendWelcomeEmails({ fullName: fullName || 'Değerli Üyemiz', email, phone })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}