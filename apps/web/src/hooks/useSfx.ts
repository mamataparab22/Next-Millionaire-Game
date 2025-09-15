import { useCallback, useRef } from 'react'

type WaveType = OscillatorType

function now(ctx: AudioContext) {
  return ctx.currentTime
}

export function useSfx() {
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const sampleCacheRef = useRef<Map<string, AudioBuffer>>(new Map())
  const timerNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const timerGainRef = useRef<GainNode | null>(null)

  const SFX_CFG = {
    clapMs: 1300,
    clapMilestoneMs: 2200,
    clapGain: 0.95,
    clapFadeInMs: 12,
    clapFadeOutMs: 120,
    timerGain: 0.38,
    timerFadeInMs: 80,
    timerFadeOutMs: 80,
    timerLoopStart: 0.02,
    timerLoopEnd: 0.86,
  } as const

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

  const baseUrl = (import.meta as any).env?.BASE_URL || '/'

  const loadSample = useCallback(
    async (name: 'clap' | 'clapMilestone' | 'timer'): Promise<AudioBuffer> => {
      const key = `sfx:${name}`
      const cache = sampleCacheRef.current
      if (cache.has(key)) return cache.get(key)!
      const file =
        name === 'clap'
          ? 'clapping.wav'
          : name === 'clapMilestone'
          ? 'milestone_clapping.wav'
          : 'Timer.wav'
      const url = `${baseUrl}${file}`
      const res = await fetch(url)
      const buf = await res.arrayBuffer()
      const ctx = await ensureCtx()
      const audio = await ctx.decodeAudioData(buf.slice(0))
      cache.set(key, audio)
      return audio
    },
    [baseUrl, ensureCtx]
  )

  const playSample = useCallback(
    async (
      buffer: AudioBuffer,
      opts?: {
        startSec?: number
        durationMs?: number
        gain?: number
        pan?: number
        loop?: boolean
        loopStart?: number
        loopEnd?: number
        fadeInMs?: number
        fadeOutMs?: number
      }
    ) => {
      const ctx = await ensureCtx()
      const master = masterRef.current!
      const src = ctx.createBufferSource()
      src.buffer = buffer
      const gain = ctx.createGain()
      gain.gain.value = typeof opts?.gain === 'number' ? opts.gain : 0.9
      let node: AudioNode = src
      if ((ctx as any).createStereoPanner && typeof opts?.pan === 'number') {
        const pan = (ctx as any).createStereoPanner()
        pan.pan.value = Math.max(-1, Math.min(1, opts.pan))
        node.connect(pan)
        pan.connect(gain)
      } else {
        node.connect(gain)
      }
      gain.connect(master)

      const startAt = now(ctx)
      const startOffset = Math.max(0, opts?.startSec ?? 0)
      const durSec = opts?.durationMs ? Math.max(0.01, opts.durationMs / 1000) : undefined

      if (opts?.loop) {
        src.loop = true
        if (typeof opts.loopStart === 'number') src.loopStart = Math.max(0, opts.loopStart)
        if (typeof opts.loopEnd === 'number') src.loopEnd = Math.max(src.loopStart, opts.loopEnd)
        src.start(startAt, startOffset)
        // fade in
        if (opts?.fadeInMs) {
          const tIn = Math.max(0, opts.fadeInMs / 1000)
          gain.gain.setValueAtTime(0.0001, startAt)
          gain.gain.linearRampToValueAtTime(opts.gain ?? 0.9, startAt + tIn)
        }
        // caller responsible to stop
        return { src, gain }
      } else {
        src.start(startAt, startOffset)
        if (typeof durSec === 'number') {
          const stopAt = startAt + durSec + 0.01
          // fade out before stop
          if (opts?.fadeOutMs) {
            const tOut = Math.max(0.02, opts.fadeOutMs / 1000)
            const tStart = Math.max(startAt, stopAt - tOut)
            try {
              gain.gain.setTargetAtTime(0.0001, tStart, tOut / 3)
            } catch {}
          }
          src.stop(stopAt)
        }
        return { src, gain }
      }
    },
    [ensureCtx]
  )

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
      opts?: {
        gain?: number
        filter?: { type: BiquadFilterType; frequency: number; Q?: number }
        attackMs?: number
        releaseMs?: number
        offsetMs?: number
        pan?: number // -1..1
      }
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
        node = biq
      } else {
        // continue
      }
      // Optional panning
      if ((ctx as any).createStereoPanner && typeof opts?.pan === 'number') {
        const pan = (ctx as any).createStereoPanner()
        pan.pan.value = Math.max(-1, Math.min(1, opts.pan))
        node.connect(pan)
        pan.connect(gain)
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
    // Crowd-like clapping: randomized bursts with stereo spread and EQ
    const bursts = 24
    for (let i = 0; i < bursts; i++) {
      const offset = Math.random() * 650 // ms
      const freq = 1800 + Math.random() * 1200 // presence band
      const pan = (Math.random() * 2 - 1) * 0.8
      playNoise(110 + Math.random() * 90, {
        gain: 0.22 + Math.random() * 0.12,
        filter: { type: 'bandpass', frequency: freq, Q: 0.9 },
        attackMs: 4 + Math.random() * 4,
        releaseMs: 140 + Math.random() * 60,
        offsetMs: offset,
        pan,
      })
    }
    // Air/room tail to avoid abrupt stop
    await playNoise(280, {
      gain: 0.11,
      filter: { type: 'lowpass', frequency: 1600, Q: 0.7 },
      offsetMs: 760,
    })
  }, [playNoise])

  const popperNormal = useCallback(async () => {
    // Popper: snappy pop + short sparkle + confetti noise
    await playTone(240, 70, { type: 'square', gain: 0.26, attackMs: 2, releaseMs: 70 })
    await playSweep(600, 1700, 160, { type: 'triangle', gain: 0.2 })
    await playNoise(220, { gain: 0.2, filter: { type: 'highpass', frequency: 1000, Q: 0.9 }, attackMs: 4, releaseMs: 150 })
  }, [playTone, playSweep, playNoise])

  const popperBig = useCallback(async () => {
    // Bigger celebration: multiple quick pops and wider sweep
    await popperNormal()
    await playTone(200, 60, { type: 'square', gain: 0.22, attackMs: 2, releaseMs: 60 })
    await playSweep(700, 1900, 180, { type: 'triangle', gain: 0.22 })
    // extra confetti hiss
    await playNoise(320, { gain: 0.24, filter: { type: 'highpass', frequency: 900, Q: 0.9 }, attackMs: 4, releaseMs: 180 })
  }, [popperNormal, playTone, playSweep, playNoise])

  const applauseSample = useCallback(async (opts?: { milestone?: boolean }) => {
    const buf = await loadSample(opts?.milestone ? 'clapMilestone' : 'clap')
    const maxMs = opts?.milestone ? SFX_CFG.clapMilestoneMs : SFX_CFG.clapMs
    await playSample(buf, {
      startSec: 0,
      durationMs: maxMs,
      gain: SFX_CFG.clapGain,
      fadeInMs: SFX_CFG.clapFadeInMs,
      fadeOutMs: SFX_CFG.clapFadeOutMs,
    })
  }, [loadSample, playSample])

  const startTimerLoop = useCallback(async () => {
    if (timerNodeRef.current) return
    const ctx = await ensureCtx()
    const buf = await loadSample('timer')
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    // loop the meat of the Timer.wav to avoid clicks
    src.loopStart = Math.min(Math.max(0, SFX_CFG.timerLoopStart), Math.max(0, buf.duration - 0.05))
    src.loopEnd = Math.min(Math.max(src.loopStart + 0.05, SFX_CFG.timerLoopEnd), buf.duration)
    const gain = ctx.createGain()
    gain.gain.value = 0.0001
    src.connect(gain)
    gain.connect(masterRef.current!)
    const t0 = now(ctx)
    src.start(t0)
    // fade in
    try {
      gain.gain.linearRampToValueAtTime(SFX_CFG.timerGain, t0 + Math.max(0.02, SFX_CFG.timerFadeInMs / 1000))
    } catch {}
    timerNodeRef.current = src
    timerGainRef.current = gain
  }, [ensureCtx, loadSample])

  const stopTimerLoop = useCallback(async () => {
    if (!timerNodeRef.current) return
    try {
      const ctx = await ensureCtx()
      const t = now(ctx)
      // quick fade out
      const g = timerGainRef.current
      if (g) {
        try {
          const tau = Math.max(0.02, SFX_CFG.timerFadeOutMs / 1000) / 3
          g.gain.setTargetAtTime(0.0001, t, tau)
        } catch {}
      }
      timerNodeRef.current.stop(t + 0.08)
    } catch {}
    timerNodeRef.current = null
    timerGainRef.current = null
  }, [ensureCtx])

  const enable = useCallback(async () => {
    await ensureCtx()
  }, [ensureCtx])

  return {
    enable,
    tick,
    correct,
    wrong,
    lifeline,
    applause,
    popperNormal,
    popperBig,
    applauseSample,
    startTimerLoop,
    stopTimerLoop,
  }
}

export default useSfx
