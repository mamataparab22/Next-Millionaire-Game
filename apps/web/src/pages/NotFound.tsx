import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <main className="min-h-[60vh] grid place-items-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">404 — Not Found</h1>
        <p>That page doesn’t exist.</p>
        <Link className="underline text-indigo-400" to="/">Go home</Link>
      </div>
    </main>
  )
}
