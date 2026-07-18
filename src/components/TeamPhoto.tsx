import { useEffect, useState } from 'react'
import { repository } from '../data'
import { useObjectUrl } from '../hooks/useObjectUrl'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Avatar do time: mostra a foto (via photoId) ou as iniciais como fallback. */
export function TeamPhoto({
  photoId,
  name,
  className = 'size-12',
}: {
  photoId?: string
  name: string
  className?: string
}) {
  const [blob, setBlob] = useState<Blob | null>(null)

  useEffect(() => {
    let active = true
    if (!photoId) {
      setBlob(null)
      return
    }
    repository.getPhoto(photoId).then((photo) => {
      if (active) setBlob(photo?.blob ?? null)
    })
    return () => {
      active = false
    }
  }, [photoId])

  const url = useObjectUrl(blob)
  const base = `shrink-0 overflow-hidden rounded-full ${className}`

  if (url) {
    return <img src={url} alt={name} className={`${base} object-cover`} />
  }
  return (
    <div
      className={`${base} flex items-center justify-center bg-slate-200 text-sm font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300`}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}
