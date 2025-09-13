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
      const url = URL.createObjectURL(blob)

      const el = audioRef.current!
      el.src = url
      playingRef.current = true
      setBusy(true)
      await el.play()
      // URL will be revoked after ended to avoid cutting off playback
      el.onended = () => {
        URL.revokeObjectURL(url)
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

  return { enable, speak, clear, enabled, busy }
}

export default useTts
