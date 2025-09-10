import { type PropsWithChildren } from 'react'

export function Modal({ children }: PropsWithChildren) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-slate-900 p-6 shadow-lg">{children}</div>
    </div>
  )
}
