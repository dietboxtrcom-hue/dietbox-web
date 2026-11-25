// src/components/SocialLinksBar.tsx
'use client'

import { usePathname } from 'next/navigation'

export interface SocialLinkItem {
  id: string
  platform: 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'x' | 'linkedin' | 'other'
  label: string
  url: string
}

export const DEFAULT_SOCIAL_LINKS: SocialLinkItem[] = [
  { id: 'ig', platform: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/dietboxtr/' },
  { id: 'fb', platform: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/dietboxtr/' },
]

export function getActiveSocialLinks(generalSettings?: any): SocialLinkItem[] {
  if (Array.isArray(generalSettings?.social_links) && generalSettings.social_links.length > 0) {
    return generalSettings.social_links.filter((s: SocialLinkItem) => s.url?.trim())
  }
  const fallback: SocialLinkItem[] = []
  if (generalSettings?.instagram_url) {
    fallback.push({
      id: 'ig',
      platform: 'instagram',
      label: 'Instagram',
      url: generalSettings.instagram_url,
    })
  }
  if (generalSettings?.facebook_url) {
    fallback.push({
      id: 'fb',
      platform: 'facebook',
      label: 'Facebook',
      url: generalSettings.facebook_url,
    })
  }
  return fallback.length > 0 ? fallback : DEFAULT_SOCIAL_LINKS
}

export function SocialPlatformIcon({ platform }: { platform: string }) {
  switch (platform) {
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
          <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.25-2.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z" />
        </svg>
      )
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
          <path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.5c0-.9.3-1.6 1.6-1.6h1.7V4a22 22 0 0 0-2.5-.1c-2.5 0-4.1 1.5-4.1 4.2v2.5H7.5v3.2h2.7V22h3.3z" />
        </svg>
      )
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
          <path d="M16.6 5.8A4.8 4.8 0 0 1 15 2.5h-3v13a2.6 2.6 0 1 1-1.8-2.5V10a5.6 5.6 0 1 0 4.8 5.5V9a7.7 7.7 0 0 0 4.5 1.4V7.4a4.8 4.8 0 0 1-2.9-1.6z" />
        </svg>
      )
    case 'x':
      return (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
          <path d="M18.2 2h3.3l-7.2 8.2L22.8 22h-6.6l-5.2-6.8L5 22H1.7l7.7-8.8L1.2 2H8l4.7 6.2L18.2 2zm-1.2 18h1.8L7.1 3.9H5.2L17 20z" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
          <path d="M6.5 8.5v11H3v-11h3.5zm.2-3.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM21 19.5h-3.5v-5.7c0-1.4-.5-2.3-1.8-2.3-1 0-1.6.7-1.8 1.3-.1.2-.1.6-.1.9v5.8h-3.5s.1-9.4 0-11h3.5v1.6c.5-.7 1.3-1.8 3.2-1.8 2.3 0 4 1.5 4 4.8v6.4z" />
        </svg>
      )
    default:
      return <span className="text-[11px] font-black">↗</span>
  }
}

export default function FloatingSocialBar({ generalSettings }: { generalSettings?: any }) {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/kurye')) return null

  const links = getActiveSocialLinks(generalSettings)
  if (links.length === 0) return null

  return (
    <div className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 flex-col gap-1.5 bg-[#0d1f18]/90 backdrop-blur-md p-1.5 rounded-l-2xl border border-r-0 border-white/15 shadow-2xl print:hidden">
      {links.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noreferrer"
          title={item.label}
          className="group relative w-9 h-9 rounded-xl bg-white/10 hover:bg-[#51a885] text-white flex items-center justify-center transition"
        >
          <SocialPlatformIcon platform={item.platform} />
          <span className="pointer-events-none opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200 absolute right-11 bg-[#0d1f18] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap border border-white/15 shadow-lg">
            {item.label}
          </span>
        </a>
      ))}
    </div>
  )
}