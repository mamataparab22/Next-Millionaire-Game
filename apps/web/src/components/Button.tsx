import { type ButtonHTMLAttributes } from 'react'

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={
  'inline-flex items-center justify-center rounded-md nm-gradient-bg px-4 py-2 text-sm font-semibold text-slate-900 shadow focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-60 ' +
        className
      }
      {...props}
    />
  )
}
