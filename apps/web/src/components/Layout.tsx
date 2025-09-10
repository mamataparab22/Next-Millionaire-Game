import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Skip link for keyboard users */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-yellow-400 focus:px-3 focus:py-2 focus:text-slate-900">Skip to main content</a>
      <Header />
      <main id="main" className="mx-auto max-w-6xl p-4" role="main">
        <Outlet />
      </main>
    </div>
  )
}
