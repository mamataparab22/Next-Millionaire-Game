export function Home() {
  return (
    <main className="min-h-screen p-6 grid place-items-center">
      <section className="text-center space-y-6">
        <h1 className="text-4xl font-extrabold">Next Millionaire</h1>
        <p className="text-slate-300 max-w-prose">
          AI-powered quiz inspired by "Who Wants to Be a Millionaire?" Choose your categories and begin your journey to $1,000,000.
        </p>
        <a href="/play" className="inline-block rounded bg-indigo-500 px-6 py-3 font-semibold hover:bg-indigo-400">
          Start Playing
        </a>
      </section>
    </main>
  )
}
