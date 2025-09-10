import { Button } from './Button'

export function Lifelines() {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-3">
      <h2 className="mb-2 text-center text-xs font-semibold tracking-wide text-slate-300">Lifelines</h2>
      <div className="grid grid-cols-3 gap-2">
        <Button title="Remove two incorrect answers">50:50</Button>
        <Button title="Audience poll">Audience</Button>
        <Button title="Switch question">Switch</Button>
      </div>
    </section>
  )
}
