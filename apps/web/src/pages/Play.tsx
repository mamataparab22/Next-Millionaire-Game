import { PrizeLadder } from '../components/PrizeLadder'
import { Lifelines } from '../components/Lifelines'
import { Card } from '../components/Card'

export function Play() {
  return (
    <main className="min-h-[70vh]">
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        {/* Game Stage */}
        <section className="space-y-4">
          <Card>
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Category: General Knowledge</p>
              <h1 className="text-2xl font-bold">Which planet is known as the Red Planet?</h1>
              <div className="grid gap-2 sm:grid-cols-2">
                <button className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-left hover:bg-slate-800">A) Mercury</button>
                <button className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-left hover:bg-slate-800">B) Venus</button>
                <button className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-left hover:bg-slate-800">C) Earth</button>
                <button className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-left hover:bg-slate-800">D) Mars</button>
              </div>
            </div>
          </Card>
          <Lifelines />
        </section>

        {/* Sidebar */}
        <PrizeLadder currentLevel={1} />
      </div>
    </main>
  )
}
