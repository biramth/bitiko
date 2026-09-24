/** Downscales + recompresses a merchant-uploaded image in the browser (canvas)
 *  so storefronts stay light on 3G — the Supabase free plan has no
 *  server-side image transforms, so this is where the weight is cut.
 *  Returns a new `File` (WebP when the browser can encode it, otherwise the
 *  original encoding); SVG/GIF are returned untouched (vector/animation must
 *  never be rasterized), as is any file that fails to decode. Safe to call
 *  on every upload — never throws, worst case returns the input. */
export async function compressImageFile(
  file: File,
  { maxDim = 1600, quality = 0.82 }: { maxDim?: number; quality?: number } = {},
): Promise<File> {
  try {
    if (!file.type.startsWith('image/')) return file
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file
    if (typeof createImageBitmap !== 'function') return file

    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    // Already small enough and already efficient — don't re-encode.
    if (scale >= 1 && (file.type === 'image/webp' || file.type === 'image/jpeg')) {
      bitmap.close()
      return file
    }
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    )
    if (!blob) return file
    const base = file.name.replace(/\.[^.]*$/, '') || 'image'
    return new File([blob], `${base}.webp`, { type: 'image/webp' })
  } catch {
    return file
  }
}
