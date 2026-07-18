/** Converte um Blob em data URL (base64), para caber no JSON de backup. */
export function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Converte uma data URL (base64) de volta para Blob ao importar um backup. */
export async function dataUrlParaBlob(dataUrl: string): Promise<Blob> {
  const resposta = await fetch(dataUrl)
  return resposta.blob()
}
