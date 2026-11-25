// src/components/ActivityTracker.tsx
'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ActivityTracker() {
  const pathname = usePathname()
  const lastLoggedRef = useRef<string>('')

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/kurye')) return

    let cancelled = false

    const timer = setTimeout(async () => {
      if (cancelled || lastLoggedRef.current === pathname) return
      lastLoggedRef.current = pathname

      try {
        let visitorId = localStorage.getItem('dietbox_visitor_id')
        if (!visitorId) {
          visitorId = `vis_${Math.random().toString(36).slice(2, 10)}`
          localStorage.setItem('dietbox_visitor_id', visitorId)
        }

        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        let customerName = user?.user_metadata?.full_name || null
        if (user && !customerName) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()
          customerName = prof?.full_name || null
        }

        const actionType = pathname.startsWith('/paketler/')
          ? 'package_view'
          : pathname === '/kalori-hesaplama'
          ? 'calculator_view'
          : pathname === '/odeme'
          ? 'checkout_view'
          : 'page_view'

        await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.id || null,
            customer_email: user?.email || null,
            customer_name: customerName,
            visitor_id: visitorId,
            path: pathname,
            page_title: typeof document !== 'undefined' ? document.title : pathname,
            action_type: actionType,
          }),
        })
      } catch {
        // Sessiz geç
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [pathname])

  return null
}