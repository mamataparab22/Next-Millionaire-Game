type LadderItem = {
  level: number
  amount: string
}

const DEFAULT_LADDER: LadderItem[] = [
  { level: 15, amount: '$1,000,000' },
  { level: 14, amount: '$500,000' },
  { level: 13, amount: '$250,000' },
  { level: 12, amount: '$125,000' },
  { level: 11, amount: '$64,000' },
  { level: 10, amount: '$32,000' },
  { level: 9, amount: '$16,000' },
  { level: 8, amount: '$8,000' },
  { level: 7, amount: '$4,000' },
  { level: 6, amount: '$2,000' },
  { level: 5, amount: '$1,000' },
  { level: 4, amount: '$500' },
  { level: 3, amount: '$300' },
  { level: 2, amount: '$200' },
  { level: 1, amount: '$100' },
]

export function PrizeLadder({ currentLevel = 1, ladder = DEFAULT_LADDER }: { currentLevel?: number; ladder?: LadderItem[] }) {
  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm">
      <h2 className="mb-2 text-center text-xs font-semibold tracking-wide text-slate-300">Prize Ladder</h2>
      <ol className="space-y-1">
        {ladder.map((item) => {
          const isCurrent = item.level === currentLevel
          const isCheckpoint = item.level === 5 || item.level === 10
          return (
            <li
              key={item.level}
              className={
                'flex items-center justify-between rounded px-2 py-1 ' +
                (isCurrent
                  ? 'bg-indigo-600 text-white'
                  : isCheckpoint
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-300')
              }
            >
              <span className="tabular-nums">{item.level.toString().padStart(2, '0')}</span>
              <span className="font-semibold">{item.amount}</span>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
