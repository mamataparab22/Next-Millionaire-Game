import { useMemo } from 'react'

type Props = {
  pieces?: number
}

export function ConfettiBurst({ pieces = 80 }: Props) {
  const items = useMemo(() => {
    const colors = ['#FDE047', '#34D399', '#60A5FA', '#F472B6', '#F87171', '#A78BFA']
    return Array.from({ length: pieces }, (_, i) => {
      const left = Math.random() * 100 // percent
      const size = 6 + Math.random() * 6 // px
      const rotate = Math.floor(Math.random() * 360)
      const delay = Math.random() * 0.25 // s
      const duration = 1.2 + Math.random() * 0.9 // s
      const color = colors[i % colors.length]
      return { left, size, rotate, delay, duration, color, i }
    })
  }, [pieces])

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="absolute inset-x-0 top-12 mx-auto h-0 w-full max-w-3xl">
        {items.map((p) => (
          <span
            key={p.i}
            className="confetti-piece"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.5,
              backgroundColor: p.color,
              transform: `rotate(${p.rotate}deg)`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
