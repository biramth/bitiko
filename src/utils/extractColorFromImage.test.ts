import { describe, expect, it } from 'vitest'
import { pickDominantColor } from './extractColorFromImage'

/** Builds a flat RGBA pixel buffer from a list of [r, g, b, a] pixels, each repeated `count` times. */
function buildPixels(...groups: { rgba: [number, number, number, number]; count: number }[]): Uint8ClampedArray {
  const total = groups.reduce((sum, g) => sum + g.count, 0)
  const data = new Uint8ClampedArray(total * 4)
  let i = 0
  for (const group of groups) {
    for (let n = 0; n < group.count; n++) {
      data[i] = group.rgba[0]
      data[i + 1] = group.rgba[1]
      data[i + 2] = group.rgba[2]
      data[i + 3] = group.rgba[3]
      i += 4
    }
  }
  return data
}

describe('pickDominantColor', () => {
  it('picks a small vivid logo mark over a large white background', () => {
    const pixels = buildPixels(
      { rgba: [255, 255, 255, 255], count: 80 }, // white background
      { rgba: [200, 30, 30, 255], count: 20 }, // red logomark
    )
    const color = pickDominantColor(pixels)
    expect(color).not.toBeNull()
    // Should read back as a reddish hex — red channel clearly dominant.
    const r = parseInt(color!.slice(1, 3), 16)
    const g = parseInt(color!.slice(3, 5), 16)
    const b = parseInt(color!.slice(5, 7), 16)
    expect(r).toBeGreaterThan(g)
    expect(r).toBeGreaterThan(b)
  })

  it('picks the larger vivid area when both colors are saturated', () => {
    const pixels = buildPixels(
      { rgba: [30, 60, 200, 255], count: 70 }, // blue, majority
      { rgba: [200, 30, 30, 255], count: 10 }, // red, minority
    )
    const color = pickDominantColor(pixels)
    expect(color).not.toBeNull()
    const b = parseInt(color!.slice(5, 7), 16)
    const r = parseInt(color!.slice(1, 3), 16)
    expect(b).toBeGreaterThan(r)
  })

  it('returns null for a purely black-and-white/gray logo', () => {
    const pixels = buildPixels(
      { rgba: [255, 255, 255, 255], count: 50 },
      { rgba: [0, 0, 0, 255], count: 30 },
      { rgba: [128, 128, 128, 255], count: 20 },
    )
    expect(pickDominantColor(pixels)).toBeNull()
  })

  it('returns null for a fully transparent image', () => {
    const pixels = buildPixels({ rgba: [200, 30, 30, 0], count: 100 })
    expect(pickDominantColor(pixels)).toBeNull()
  })

  it('ignores near-transparent pixels but still finds the opaque logo color', () => {
    const pixels = buildPixels(
      { rgba: [200, 30, 30, 10], count: 50 }, // faint antialiasing fringe, should be skipped
      { rgba: [40, 180, 90, 255], count: 50 }, // opaque green logomark
    )
    const color = pickDominantColor(pixels)
    expect(color).not.toBeNull()
    const g = parseInt(color!.slice(3, 5), 16)
    const r = parseInt(color!.slice(1, 3), 16)
    expect(g).toBeGreaterThan(r)
  })
})
