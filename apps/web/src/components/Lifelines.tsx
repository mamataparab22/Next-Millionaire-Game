import { Button } from './Button'

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
      <h2 id="lifelines-heading" className="mb-2 text-center text-xs font-semibold tracking-wide text-slate-300">Lifelines</h2>
      <div className="grid grid-cols-3 gap-2">
        <Button
          title="Remove two incorrect answers"
          onClick={onUseFifty}
          disabled={disableAll || fiftyUsed}
          aria-disabled={disableAll || fiftyUsed}
          aria-pressed={fiftyUsed}
        >
          50:50
        </Button>
  <Button title="Audience poll" onClick={onUseAudience} disabled={disableAll || audienceUsed} aria-disabled={disableAll || audienceUsed} aria-pressed={audienceUsed}>Audience</Button>
  <Button title="Switch question" onClick={onUseSwitch} disabled={disableAll || switchUsed} aria-disabled={disableAll || switchUsed} aria-pressed={switchUsed} data-action="switch">Switch</Button>
      </div>
    </section>
  )
}
