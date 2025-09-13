import { useCallback, useEffect, useRef, useState } from 'react'

export type TtsOptions = {
  voice?: string
  format?: 'mp3' | 'wav' | 'flac' | 'ogg' | 'aac'
  model?: string
}

export type Utterance = {
  id?: string
  text: string
  opts?: TtsOptions
}

export function useTts() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const queueRef = useRef<Utterance[]>([])
  const playingRef = useRef(false)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const cacheRef = useRef<Map<string, string>>(new Map())
  const orderRef = useRef<string[]>([])
  const MAX_CACHE = 24

  // Ensure a single audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }
    const el = audioRef.current
    const onEnded = () => {
      playingRef.current = false
      playNext()
    }
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('ended', onEnded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const playNext = useCallback(async () => {
    if (!enabled) return
    if (playingRef.current) return
    const next = queueRef.current.shift()
    if (!next) {
      setBusy(false)
      return
    }
    try {
      // Use cached audio if available by id
      let url: string | undefined
      let usedPrefetch = false
      if (next.id && cacheRef.current.has(next.id)) {
        url = cacheRef.current.get(next.id)!
        usedPrefetch = true
        // Remove from cache order; we'll revoke after play
        orderRef.current = orderRef.current.filter((k) => k !== next.id)
        cacheRef.current.delete(next.id)
      }
      if (!url) {
        const base = import.meta.env.VITE_API_BASE as string | undefined
        if (!base) throw new Error('VITE_API_BASE missing')
        const body = JSON.stringify({ text: next.text, ...(next.opts || {}) })
        const res = await fetch(`${base}/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
        if (!res.ok) throw new Error(`TTS failed: ${res.status}`)
        const blob = await res.blob()
        url = URL.createObjectURL(blob)
      }

      const el = audioRef.current!
      el.src = url
      playingRef.current = true
      setBusy(true)
      await el.play()
      // URL will be revoked after ended to avoid cutting off playback
      el.onended = () => {
        try { if (url) URL.revokeObjectURL(url) } catch {}
        playingRef.current = false
      }
    } catch {
      // noop; could fallback to SpeechSynthesis
      playingRef.current = false
      setBusy(false)
    }
    // Continue with any remaining items
    if (!playingRef.current) playNext()
  }, [enabled])

  const enable = useCallback(async () => {
    setEnabled(true)
    // warm user gesture for play
    if (audioRef.current) {
      try { await audioRef.current.play().catch(() => undefined) } catch {}
      if (!audioRef.current.paused) {
        audioRef.current.pause()
      }
    }
  }, [])

  const speak = useCallback((text: string, opts?: TtsOptions) => {
    if (!text) return
    queueRef.current.push({ text, opts })
    if (enabled) playNext()
  }, [enabled, playNext])

  const speakWithId = useCallback((id: string, text: string, opts?: TtsOptions) => {
    if (!id || !text) return
    queueRef.current.push({ id, text, opts })
    if (enabled) playNext()
  }, [enabled, playNext])

  const prefetch = useCallback(async (id: string, text: string, opts?: TtsOptions) => {
    if (!id || !text) return
    if (cacheRef.current.has(id)) return
    try {
      const base = import.meta.env.VITE_API_BASE as string | undefined
      if (!base) return
      const body = JSON.stringify({ text, ...(opts || {}) })
      const res = await fetch(`${base}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      cacheRef.current.set(id, url)
      orderRef.current.push(id)
      // Trim cache
      while (orderRef.current.length > MAX_CACHE) {
        const oldest = orderRef.current.shift()
        if (!oldest) break
        const u = cacheRef.current.get(oldest)
        if (u) {
          try { URL.revokeObjectURL(u) } catch {}
        }
        cacheRef.current.delete(oldest)
      }
    } catch {
      // ignore prefetch errors
    }
  }, [])

  const clear = useCallback(() => {
    queueRef.current = []
    const el = audioRef.current
    if (el) {
      el.pause()
      el.src = ''
    }
    playingRef.current = false
    setBusy(false)
  }, [])

  return { enable, speak, speakWithId, prefetch, clear, enabled, busy }
}

export default useTts
