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

  const playNoise = useCallback(
    async (
      durationMs: number,
      opts?: { gain?: number; filter?: { type: BiquadFilterType; frequency: number; Q?: number }; attackMs?: number; releaseMs?: number; offsetMs?: number }
    ) => {
      const ctx = await ensureCtx()
      const master = masterRef.current!
      const sampleRate = ctx.sampleRate
      const frameCount = Math.max(1, Math.floor((durationMs / 1000) * sampleRate))
      const buffer = ctx.createBuffer(1, frameCount, sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < frameCount; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.8
      }

      const src = ctx.createBufferSource()
      src.buffer = buffer

      const gain = ctx.createGain()
      gain.gain.value = 0

      let node: AudioNode = src
      if (opts?.filter) {
        const biq = ctx.createBiquadFilter()
        biq.type = opts.filter.type
        biq.frequency.value = opts.filter.frequency
        if (opts.filter.Q) biq.Q.value = opts.filter.Q
        node.connect(biq)
        biq.connect(gain)
      } else {
        node.connect(gain)
      }
      gain.connect(master)

      const t0 = now(ctx) + (opts?.offsetMs ? opts.offsetMs / 1000 : 0)
      const attack = (opts?.attackMs ?? 12) / 1000
      const release = (opts?.releaseMs ?? 120) / 1000
      const g = opts?.gain ?? 0.25
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(g, t0 + attack)
      gain.gain.setTargetAtTime(0.0001, t0 + durationMs / 1000, release)

      src.start(t0)
      src.stop(t0 + durationMs / 1000 + release + 0.02)
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

  const applause = useCallback(async () => {
    // Cluster of clap-like bursts, slightly louder and tighter timing
    const bursts = 18
    for (let i = 0; i < bursts; i++) {
      const offset = Math.random() * 700 // ms
      const freq = 1500 + Math.random() * 900
      playNoise(120 + Math.random() * 80, {
        gain: 0.18 + Math.random() * 0.1,
        filter: { type: 'bandpass', frequency: freq, Q: 0.9 },
        attackMs: 6,
        releaseMs: 120,
        offsetMs: offset,
      })
    }
    // fuller tail
    await playNoise(260, { gain: 0.1, filter: { type: 'lowpass', frequency: 1400, Q: 0.8 }, offsetMs: 820 })
  }, [playNoise])

  const popper = useCallback(async () => {
    // Popper: quick pop + sparkle sweep + confetti noise
    await playTone(220, 60, { type: 'square', gain: 0.22, attackMs: 2, releaseMs: 60 })
    await playSweep(500, 1600, 180, { type: 'triangle', gain: 0.18 })
    await playNoise(260, { gain: 0.18, filter: { type: 'highpass', frequency: 900, Q: 0.8 }, attackMs: 4, releaseMs: 160 })
  }, [playTone, playSweep, playNoise])

  const enable = useCallback(async () => {
    await ensureCtx()
  }, [ensureCtx])

  return { enable, tick, correct, wrong, lifeline, applause, popper }
}

export default useSfx
