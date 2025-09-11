export function LoadingQuestions() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-4 blur-2xl opacity-20 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300 rounded-lg animate-pulse" />
      <div className="relative rounded-lg border border-slate-800 bg-slate-900/95 p-4 shadow" role="status" aria-live="polite" aria-label="Loading questions">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <div className="h-4 w-32 rounded skeleton" />
          <div className="h-4 w-16 rounded skeleton" />
        </div>
        <div className="mt-3 h-6 w-56 rounded skeleton" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="h-10 rounded border border-slate-800 skeleton" />
          <div className="h-10 rounded border border-slate-800 skeleton" />
          <div className="h-10 rounded border border-slate-800 skeleton" />
          <div className="h-10 rounded border border-slate-800 skeleton" />
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-8 w-24 rounded skeleton" />
          <div className="h-8 w-24 rounded skeleton" />
          <div className="h-8 w-20 rounded skeleton" />
          <div className="ml-auto h-5 w-20 rounded skeleton" />
        </div>
      </div>
    </div>
  )
}
