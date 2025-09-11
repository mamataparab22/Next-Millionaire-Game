type Props = {
  onUseFifty: () => void
  onUseAudience?: () => void
  onUseSwitch?: () => void
  fiftyUsed?: boolean
  audienceUsed?: boolean
  switchUsed?: boolean
  disableAll?: boolean
}

export function Lifelines({ onUseFifty, onUseAudience, onUseSwitch, fiftyUsed = false, audienceUsed = false, switchUsed = false, disableAll = false }: Props) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-3" aria-labelledby="lifelines-heading">
      <h2 id="lifelines-heading" className="mb-2 text-center text-xs font-semibold tracking-wide text-slate-300">
        <span className="nm-gradient-text">Lifelines</span>
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {/* 50:50 Lifeline */}
        <div className="relative group">
          <button
            onClick={onUseFifty}
            disabled={disableAll || fiftyUsed}
            aria-disabled={disableAll || fiftyUsed}
            aria-pressed={fiftyUsed}
            aria-describedby="tip-fifty"
            aria-label="Fifty-Fifty lifeline"
            className="w-full h-12 rounded-full nm-gradient-bg text-slate-900 text-lg font-bold shadow transition transform hover:brightness-105 group-hover:scale-[1.03] focus:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="50:50"
          >
            <span aria-hidden="true">50:50</span>
          </button>
          <div id="tip-fifty" role="tooltip" className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition">
            50:50
          </div>
        </div>

        {/* Audience Lifeline */}
        <div className="relative group">
          <button
            onClick={onUseAudience}
            disabled={disableAll || audienceUsed}
            aria-disabled={disableAll || audienceUsed}
            aria-pressed={audienceUsed}
            aria-describedby="tip-audience"
            aria-label="Audience Poll lifeline"
            className="w-full h-12 rounded-full nm-gradient-bg text-slate-900 text-lg font-bold shadow transition transform hover:brightness-105 group-hover:scale-[1.03] focus:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Audience Poll"
          >
            <span aria-hidden="true">👥</span>
          </button>
          <div id="tip-audience" role="tooltip" className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition">
            Audience Poll
          </div>
        </div>

        {/* Switch Lifeline */}
        <div className="relative group">
          <button
            onClick={onUseSwitch}
            disabled={disableAll || switchUsed}
            aria-disabled={disableAll || switchUsed}
            aria-pressed={switchUsed}
            aria-describedby="tip-switch"
            aria-label="Switch Question lifeline"
            className="w-full h-12 rounded-full nm-gradient-bg text-slate-900 text-lg font-bold shadow transition transform hover:brightness-105 group-hover:scale-[1.03] focus:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Switch Question"
            data-action="switch"
          >
            <span aria-hidden="true">🔄️</span>
          </button>
          <div id="tip-switch" role="tooltip" className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition">
            Switch
          </div>
        </div>
      </div>
    </section>
  )
}
