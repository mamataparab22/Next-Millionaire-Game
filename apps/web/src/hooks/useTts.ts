import { useCallback, useMemo, useRef } from 'react'

type TtsOptions = {
	voice?: string
	speed?: number
	stream?: boolean
	model?: string
}

export function useTts(apiBase: string) {
	const audioRef = useRef<HTMLAudioElement | null>(null)
	const abortRef = useRef<AbortController | null>(null)
	const msRef = useRef<MediaSource | null>(null)
	const sbRef = useRef<SourceBuffer | null>(null)
	const queueRef = useRef<Uint8Array[]>([])
	const appendingRef = useRef<boolean>(false)
	const startTimerRef = useRef<number | null>(null)

	const ensureAudio = useCallback(() => {
		if (!audioRef.current) {
			audioRef.current = new Audio()
		}
		return audioRef.current
	}, [])

	const teardownMse = useCallback(() => {
		try {
			const a = audioRef.current
			const ms = msRef.current
			if (a) {
				a.pause()
				a.removeAttribute('src')
				a.load()
			}
			if (ms && ms.readyState === 'open') {
				try { ms.endOfStream() } catch {}
			}
		} catch {}
		sbRef.current = null
		msRef.current = null
		queueRef.current = []
		appendingRef.current = false
	}, [])

	const speak = useCallback(
		async (text: string, opts?: TtsOptions) => {
			if (!text?.trim()) return
			// Stop any in-flight stream
			abortRef.current?.abort()
			teardownMse()
			const a = ensureAudio()
			// Non-streaming fetch of mp3
			const res = await fetch(`${apiBase}/tts`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ input: text, voice: opts?.voice ?? 'nova', speed: opts?.speed, stream: false, model: opts?.model }),
			})
			if (!res.ok) {
				const msg = await res.text()
				throw new Error(`TTS failed: ${res.status} ${msg}`)
			}
			const blob = await res.blob()
			const url = URL.createObjectURL(blob)
			a.src = url
			await a.play()
		},
		[apiBase, ensureAudio, teardownMse]
	)

	const appendNext = useCallback(() => {
		const sb = sbRef.current
		if (!sb) return
		if (appendingRef.current) return
		const next = queueRef.current.shift()
		if (!next) return
				try {
					appendingRef.current = true
					const copy = new Uint8Array(next.byteLength)
					copy.set(next)
					sb.appendBuffer(copy)
		} catch {
			// If failed, requeue and retry later
			queueRef.current.unshift(next)
			appendingRef.current = false
		}
	}, [])

	const speakStream = useCallback(
		async (text: string, opts?: TtsOptions) => {
			if (!text?.trim()) return
			if (!(window as any).MediaSource) {
				// Fallback
				return speak(text, opts)
			}

			// Debounce start to avoid StrictMode double-invoke/rapid re-renders aborting immediately
			if (startTimerRef.current != null) {
				clearTimeout(startTimerRef.current)
				startTimerRef.current = null
			}

			startTimerRef.current = window.setTimeout(() => {
				abortRef.current?.abort()
				teardownMse()
				const a = ensureAudio()
				const ms = new MediaSource()
				msRef.current = ms
				const url = URL.createObjectURL(ms)
				a.src = url
				const controller = new AbortController()
				abortRef.current = controller

				const startFetch = async () => {
					const res = await fetch(`${apiBase}/tts`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ input: text, voice: opts?.voice ?? 'nova', speed: opts?.speed, stream: true, model: opts?.model }),
						signal: controller.signal,
					})
					if (!res.ok || !res.body) {
						// Fallback to non-streaming
						return speak(text, opts)
					}
					const reader = res.body.getReader()
					const pump = async () => {
						while (true) {
							const { value, done } = await reader.read()
							if (done) break
							if (value && value.byteLength) {
								queueRef.current.push(value instanceof Uint8Array ? value : new Uint8Array(value))
								appendNext()
							}
						}
					}
					try { await pump() } finally {
						// End when queue drains
						const maybeEnd = () => {
							if (!sbRef.current || !msRef.current) return
							if (sbRef.current.updating || queueRef.current.length > 0) return
							try { msRef.current.endOfStream() } catch {}
						}
						const i = setInterval(() => { maybeEnd() }, 120)
						const stopCheck = () => { clearInterval(i) }
						a.addEventListener('ended', stopCheck, { once: true })
					}
				}

				ms.addEventListener('sourceopen', () => {
					try {
						const sb = ms.addSourceBuffer('audio/mpeg')
						sbRef.current = sb
						sb.addEventListener('updateend', () => {
							appendingRef.current = false
							appendNext()
						})
						// Kick off streaming fetch after SourceBuffer exists
						startFetch()
							.then(() => {
								// start playback when we have some data
								a.play().catch(() => {})
							})
							.catch((err) => {
								// Ignore AbortError; fallback to non-streaming for other errors
								if ((err as any)?.name === 'AbortError' || String(err)?.includes('AbortError')) return
								speak(text, opts)
							})
					} catch {
						// If SourceBuffer type unsupported, fallback
						speak(text, opts)
					}
				}, { once: true })

				// Try to start play (may wait for data)
				a.play().catch(() => {})
			}, 180)
		},
		[apiBase, ensureAudio, speak, teardownMse, appendNext]
	)

	const stop = useCallback(() => {
		if (startTimerRef.current != null) {
			clearTimeout(startTimerRef.current)
			startTimerRef.current = null
		}
		try { abortRef.current?.abort() } catch {}
		const a = ensureAudio()
		try { a.pause() } catch {}
		teardownMse()
	}, [ensureAudio, teardownMse])

	const streamingSupported = useMemo(() => typeof (window as any).MediaSource !== 'undefined', [])

	return { speak, speakStream, stop, streamingSupported }
}

export default useTts
