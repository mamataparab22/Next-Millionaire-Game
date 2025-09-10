import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <div className="mx-auto max-w-6xl p-4">
        <Outlet />
      </div>
    </div>
  )
}
