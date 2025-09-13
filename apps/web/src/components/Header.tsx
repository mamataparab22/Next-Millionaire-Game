import { Link } from 'react-router-dom'

export function Header() {
  return (
  <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <Link to="/" className="font-extrabold tracking-tight nm-gradient-text">
          Home
        </Link>
    <nav className="space-x-4 text-sm" aria-label="Primary">
          <Link className="hover:underline" to="/play">Play</Link>
          <Link className="hover:underline" to="/results">Results</Link>
        </nav>
      </div>
    </header>
  )
}
