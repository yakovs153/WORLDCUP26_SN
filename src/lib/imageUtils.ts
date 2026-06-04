/**
 * Resize an image File to a max width/height (preserves aspect ratio),
 * compress as JPEG, return as a Blob.
 *
 * Used to keep player photos small (~10-30 KB) so they fit in localStorage
 * in demo mode and don't bloat Firestore in production.
 */
export function resizeImage(
  file: File,
  maxSize = 240,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image file'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        URL.revokeObjectURL(url)
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2D not supported'))
          return
        }
        ctx.fillStyle = '#1a1320'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(
          (blob) => {
            if (!blob) reject(new Error('Compression failed'))
            else resolve(blob)
          },
          'image/jpeg',
          quality
        )
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to read image'))
    }
    img.src = url
  })
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}
