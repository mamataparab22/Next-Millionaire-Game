import { useCallback, useMemo } from 'react'

type TtsOptions = { voice?: string; speed?: number }

export function useTts() {
  const speak = useCallback(async (text: string, opts?: TtsOptions) => {
    if (!text?.trim()) return
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const utter = new SpeechSynthesisUtterance(text)
    if (opts?.voice) {
      const match = window.speechSynthesis.getVoices().find(v => v.name.toLowerCase().includes(opts.voice!.toLowerCase()))
      if (match) utter.voice = match
    }
    if (opts?.speed && Number.isFinite(opts.speed)) utter.rate = Math.max(0.5, Math.min(2, opts.speed!))
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
  }, [])

  const speakStream = useCallback(async (text: string, opts?: TtsOptions) => {
    // No streaming; fall back to regular speak
    return speak(text, opts)
  }, [speak])

  const stop = useCallback(() => {
    try { window.speechSynthesis.cancel() } catch {}
  }, [])

  const streamingSupported = useMemo(() => false, [])

  return { speak, speakStream, stop, streamingSupported }
}

export default useTts
