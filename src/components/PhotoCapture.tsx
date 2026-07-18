import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from './ui'
import { compressImage } from '../utils/image'

type State = 'starting' | 'active' | 'unavailable' | 'preview' | 'processing'

/**
 * Overlay de captura de foto pela câmera.
 * - Tenta a câmera ao vivo (getUserMedia); permite refazer antes de confirmar.
 * - Se a câmera não estiver disponível/for negada, cai para seleção de arquivo
 *   (no celular, abre a câmera nativa).
 * A foto retornada já vem comprimida (JPEG, no máx. 1024px).
 */
export function PhotoCapture({
  onConfirm,
  onCancel,
}: {
  onConfirm: (photo: Blob) => void
  onCancel: () => void
}) {
  const [state, setState] = useState<State>('starting')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const blobRef = useRef<Blob | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    setState('starting')
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unavailable')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setState('active')
    } catch {
      setState('unavailable')
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  // Libera a URL de prévia anterior quando muda/desmonta.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function showPreview(blob: Blob) {
    blobRef.current = blob
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return URL.createObjectURL(blob)
    })
    setState('preview')
  }

  async function capture() {
    const video = videoRef.current
    if (!video) return
    setState('processing')

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setState('active')
      return
    }
    ctx.drawImage(video, 0, 0)

    const raw = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    )
    if (!raw) {
      setState('active')
      return
    }
    const compressed = await compressImage(raw)
    stopCamera()
    showPreview(compressed)
  }

  async function selectFile(file: File) {
    setState('processing')
    try {
      const compressed = await compressImage(file)
      showPreview(compressed)
    } catch {
      setState('unavailable')
    }
  }

  function retake() {
    blobRef.current = null
    startCamera()
  }

  function confirm() {
    if (blobRef.current) onConfirm(blobRef.current)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        {/* Câmera ao vivo */}
        {(state === 'starting' ||
          state === 'active' ||
          state === 'processing') && (
          <video
            ref={videoRef}
            playsInline
            muted
            className="size-full object-cover"
          />
        )}

        {/* Prévia da foto capturada */}
        {state === 'preview' && previewUrl && (
          <img src={previewUrl} alt="Prévia" className="size-full object-cover" />
        )}

        {/* Câmera indisponível → seleção de arquivo */}
        {state === 'unavailable' && (
          <div className="flex size-full flex-col items-center justify-center gap-4 p-6 text-center text-white">
            <span className="text-4xl">📷</span>
            <p className="max-w-xs text-sm text-slate-300">
              A câmera não está disponível. Você pode escolher uma foto da
              galeria (ou continuar sem foto).
            </p>
            <label className="cursor-pointer rounded-xl bg-white px-4 py-3 font-semibold text-slate-900">
              Escolher foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) selectFile(file)
                }}
              />
            </label>
          </div>
        )}

        {state === 'processing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
            Processando…
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between gap-3 bg-black px-6 py-5 pb-8">
        {state === 'preview' ? (
          <>
            <Button variant="secondary" onClick={retake}>
              Refazer
            </Button>
            <Button onClick={confirm}>Usar foto</Button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                stopCamera()
                onCancel()
              }}
              className="rounded-xl px-4 py-3 font-semibold text-white"
            >
              Cancelar
            </button>
            {state === 'active' && (
              <button
                type="button"
                onClick={capture}
                aria-label="Capturar foto"
                className="size-16 rounded-full border-4 border-white bg-white/20 active:scale-95"
              />
            )}
            <span className="w-16" />
          </>
        )}
      </div>
    </div>
  )
}
