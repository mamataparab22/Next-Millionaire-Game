import { type ButtonHTMLAttributes } from 'react'

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={
        'inline-flex items-center justify-center rounded-md bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:opacity-60 ' +
        className
      }
      {...props}
    />
  )
}
