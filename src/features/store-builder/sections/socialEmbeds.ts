import type { SocialEmbedPlatform } from '@/types/builder'

export interface SocialEmbed {
  platform: SocialEmbedPlatform
  embedUrl: string
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

function parseUrl(rawUrl: string): URL | null {
  const value = rawUrl.trim()
  if (!value) return null
  try {
    return new URL(value)
  } catch {
    try {
      return new URL(`https://${value}`)
    } catch {
      return null
    }
  }
}

function tiktok(parsed: URL): SocialEmbed | null {
  const host = parsed.hostname.toLowerCase()
  if (host !== 'tiktok.com' && host !== 'www.tiktok.com' && host !== 'm.tiktok.com') return null
  const match = parsed.pathname.match(/^\/@[^/]+\/video\/(\d+)/)
  if (!match) return null
  return { platform: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}` }
}

function instagram(parsed: URL): SocialEmbed | null {
  const host = parsed.hostname.toLowerCase()
  if (host !== 'instagram.com' && host !== 'www.instagram.com') return null
  const match = parsed.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/)
  if (!match) return null
  return { platform: 'instagram', embedUrl: `https://www.instagram.com/${match[1]}/${match[2]}/embed` }
}

function facebook(parsed: URL): SocialEmbed | null {
  const host = parsed.hostname.toLowerCase()
  if (host !== 'facebook.com' && host !== 'www.facebook.com' && host !== 'm.facebook.com') return null
  const path = parsed.pathname
  const isVideo =
    path.startsWith('/watch') ||
    path.includes('/videos/') ||
    path.includes('/reel/') ||
    path.includes('/live/')
  const href = encodeURIComponent(`https://www.facebook.com${path}${parsed.search}`)
  if (href.length < 30) return null
  return {
    platform: 'facebook',
    embedUrl: `https://www.facebook.com/plugins/${isVideo ? 'video' : 'post'}.php?href=${href}&show_text=true`,
  }
}

function youtube(parsed: URL): SocialEmbed | null {
  const host = parsed.hostname.toLowerCase()
  let id: string | null = null
  if (host === 'youtu.be') {
    id = parsed.pathname.slice(1).split('/')[0] ?? null
  } else if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com') {
    if (parsed.pathname === '/watch') id = parsed.searchParams.get('v')
    else {
      const match = parsed.pathname.match(/^\/(shorts|live|embed)\/([A-Za-z0-9_-]+)/)
      if (match) id = match[2] ?? null
    }
  } else {
    return null
  }
  if (!id || !YOUTUBE_ID.test(id)) return null
  return { platform: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${id}` }
}

/** Convertit l'URL d'une publication (collée par le commerçant) en URL
 *  d'intégration officielle — jamais l'URL brute (ni `javascript:`, ni hôte
 *  inconnu). `null` = lien non reconnu, le bloc l'ignore côté vitrine et
 *  l'éditeur le signale. */
export function socialEmbedSrc(rawUrl: string): SocialEmbed | null {
  const parsed = parseUrl(rawUrl)
  if (!parsed) return null
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  return tiktok(parsed) ?? instagram(parsed) ?? facebook(parsed) ?? youtube(parsed)
}

export const SOCIAL_PLATFORMS: { value: SocialEmbedPlatform; label: string; hint: string }[] = [
  { value: 'tiktok', label: 'TikTok', hint: 'Lien d’une vidéo (tiktok.com/@…/video/…)' },
  { value: 'instagram', label: 'Instagram', hint: 'Lien d’un post ou reel' },
  { value: 'facebook', label: 'Facebook', hint: 'Lien d’une publication ou vidéo' },
  { value: 'youtube', label: 'YouTube', hint: 'Lien d’une vidéo ou d’un short' },
]
