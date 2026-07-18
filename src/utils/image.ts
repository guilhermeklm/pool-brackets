// Compressão/redimensionamento de fotos antes de salvar no IndexedDB.
// Objetivo: não estourar a cota do navegador com imagens grandes.

const MAX_SIDE = 1024
const JPEG_QUALITY = 0.7

/**
 * Redimensiona a imagem para no máximo `MAX_SIDE` px no maior lado e recomprime
 * como JPEG. Recebe um Blob (foto da câmera/arquivo) e devolve um Blob JPEG
 * menor.
 */
export async function compressImage(input: Blob): Promise<Blob> {
  const bitmap = await createBitmap(input)
  try {
    const { width, height } = resize(bitmap.width, bitmap.height)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível processar a imagem.')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    })
    if (!blob) throw new Error('Falha ao comprimir a imagem.')
    return blob
  } finally {
    bitmap.close()
  }
}

/** Cria um ImageBitmap a partir de um Blob, com fallback via <img>. */
async function createBitmap(blob: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob)
  }
  // Fallback para navegadores sem createImageBitmap.
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    return await createImageBitmap(img)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'))
    img.src = src
  })
}

/** Calcula as dimensões mantendo a proporção, limitando ao maior lado. */
function resize(
  width: number,
  height: number,
): { width: number; height: number } {
  const largest = Math.max(width, height)
  if (largest <= MAX_SIDE) {
    return { width, height }
  }
  const scale = MAX_SIDE / largest
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}
