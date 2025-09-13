import { useCallback, useRef } from 'react'

type WaveType = OscillatorType

function now(ctx: AudioContext) {
  return ctx.currentTime
}

export function useSfx() {
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)

  const ensureCtx = useCallback(async () => {
    if (!ctxRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      ctxRef.current = ctx
      const master = ctx.createGain()
      master.gain.value = 0.6
      master.connect(ctx.destination)
      masterRef.current = master
    }
    if (ctxRef.current!.state === 'suspended') {
      await ctxRef.current!.resume()
    }
    return ctxRef.current!
  }, [])

  const playTone = useCallback(
    async (
      freq: number,
      durationMs: number,
      opts?: { type?: WaveType; gain?: number; attackMs?: number; releaseMs?: number }
    ) => {
      const ctx = await ensureCtx()
      const master = masterRef.current!
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = opts?.type ?? 'sine'
      osc.frequency.value = freq
      gain.gain.value = 0
      osc.connect(gain)
      gain.connect(master)

      const g = opts?.gain ?? 0.25
      const attack = (opts?.attackMs ?? 8) / 1000
      const release = (opts?.releaseMs ?? 40) / 1000
      const t0 = now(ctx)
      const t1 = t0 + durationMs / 1000
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(g, t0 + attack)
      gain.gain.setTargetAtTime(0, t1 - release, release)

      osc.start(t0)
      osc.stop(t1 + release + 0.02)
    },
    [ensureCtx]
  )

  const playSweep = useCallback(
    async (
      startHz: number,
      endHz: number,
      durationMs: number,
      opts?: { type?: WaveType; gain?: number }
    ) => {
      const ctx = await ensureCtx()
      const master = masterRef.current!
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = opts?.type ?? 'sawtooth'
      gain.gain.value = opts?.gain ?? 0.15
      osc.connect(gain)
      gain.connect(master)
      const t0 = now(ctx)
      const t1 = t0 + durationMs / 1000
      osc.frequency.setValueAtTime(startHz, t0)
      osc.frequency.linearRampToValueAtTime(endHz, t1)
      // simple quick fade in/out
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(opts?.gain ?? 0.15, t0 + 0.03)
      gain.gain.linearRampToValueAtTime(0.001, t1)
      osc.start(t0)
      osc.stop(t1 + 0.02)
    },
    [ensureCtx]
  )

  const tick = useCallback(async () => {
    // short tick
    await playTone(880, 80, { type: 'square', gain: 0.18, attackMs: 4, releaseMs: 50 })
  }, [playTone])

  const correct = useCallback(async () => {
    // simple rising triad
    await playTone(523.25, 150, { type: 'triangle', gain: 0.22 }) // C5
    await playTone(659.25, 170, { type: 'triangle', gain: 0.22 }) // E5
    await playTone(783.99, 220, { type: 'triangle', gain: 0.22 }) // G5
  }, [playTone])

  const wrong = useCallback(async () => {
    // buzzer style: two low bursts with slight detune
    await playTone(140, 180, { type: 'square', gain: 0.25 })
    await playTone(120, 220, { type: 'square', gain: 0.25 })
  }, [playTone])

  const lifeline = useCallback(async () => {
    // whoosh up
    await playSweep(300, 900, 260, { type: 'sawtooth', gain: 0.12 })
  }, [playSweep])

  const enable = useCallback(async () => {
    await ensureCtx()
  }, [ensureCtx])

  return { enable, tick, correct, wrong, lifeline }
}

export default useSfx
