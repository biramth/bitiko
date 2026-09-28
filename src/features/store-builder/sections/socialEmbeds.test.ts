import { describe, expect, it } from 'vitest'
import { socialEmbedSrc } from './socialEmbeds'

describe('socialEmbedSrc', () => {
  it('convertit une vidéo TikTok en lecteur officiel', () => {
    expect(socialEmbedSrc('https://www.tiktok.com/@maisonvideo/video/7341234567890123456')).toEqual({
      platform: 'tiktok',
      embedUrl: 'https://www.tiktok.com/embed/v2/7341234567890123456',
    })
  })

  it('refuse les liens courts TikTok non résolvables', () => {
    expect(socialEmbedSrc('https://vm.tiktok.com/XYZabc/')).toBeNull()
    expect(socialEmbedSrc('https://www.tiktok.com/@maisonvideo')).toBeNull()
  })

  it('convertit posts et reels Instagram', () => {
    expect(socialEmbedSrc('https://www.instagram.com/p/C8AbCdEfGhI/')?.embedUrl).toBe(
      'https://www.instagram.com/p/C8AbCdEfGhI/embed',
    )
    expect(socialEmbedSrc('instagram.com/reel/C8AbCdEfGhI?utm_source=ig_web')?.platform).toBe('instagram')
  })

  it('convertit une publication Facebook en plugin post', () => {
    const embed = socialEmbedSrc('https://www.facebook.com/maboutique/posts/1234567890123456')
    expect(embed?.platform).toBe('facebook')
    expect(embed?.embedUrl).toContain('/plugins/post.php?href=')
  })

  it('convertit une vidéo Facebook en plugin vidéo', () => {
    const embed = socialEmbedSrc('https://www.facebook.com/maboutique/videos/1234567890123456')
    expect(embed?.embedUrl).toContain('/plugins/video.php?href=')
  })

  it('convertit les formats YouTube en embed respectueux de la vie privée', () => {
    expect(socialEmbedSrc('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.embedUrl).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
    expect(socialEmbedSrc('https://youtu.be/dQw4w9WgXcQ')?.platform).toBe('youtube')
    expect(socialEmbedSrc('https://www.youtube.com/shorts/dQw4w9WgXcQ')?.platform).toBe('youtube')
  })

  it('refuse les URL dangereuses ou inconnues', () => {
    expect(socialEmbedSrc('')).toBeNull()
    expect(socialEmbedSrc('javascript:alert(1)')).toBeNull()
    expect(socialEmbedSrc('https://evil.example.com/video/123')).toBeNull()
    expect(socialEmbedSrc('https://www.youtube.com/watch?v=tropcourt')).toBeNull()
    expect(socialEmbedSrc('n importe quoi')).toBeNull()
  })
})
