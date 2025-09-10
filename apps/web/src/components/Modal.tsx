import { type PropsWithChildren, useEffect, useRef, useState } from 'react'

type Props = PropsWithChildren & {
  onClose?: () => void
  ariaLabelledby?: string
  ariaDescribedby?: string
  closeOnBackdropClick?: boolean
}

export function Modal({ children, onClose, ariaLabelledby, ariaDescribedby, closeOnBackdropClick = true }: Props) {
  const [visible, setVisible] = useState(false)
  const contentRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Focus trap and ESC handling
  useEffect(() => {
    const content = contentRef.current
    if (content) {
      const focusables = Array.from(
        content.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
      ;(focusables[0] ?? content).focus()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Tab' && content) {
        const focusables = Array.from(
          content.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (e.shiftKey) {
          if ((first && active === first) || !content.contains(active)) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (last && active === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className={
        'fixed inset-0 z-50 grid place-items-center p-4 transition-opacity duration-200 ' +
        (visible ? 'bg-black/50 opacity-100' : 'bg-black/0 opacity-0')
      }
      aria-modal="true"
      role="dialog"
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      onMouseDown={(e) => {
        if (!closeOnBackdropClick || !onClose) return
        // Close when clicking outside the content
        if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
          onClose()
        }
      }}
    >
      <div
        className={
          'w-full max-w-lg transform rounded-lg bg-slate-900 p-6 shadow-lg transition-all duration-200 ' +
          (visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0')
        }
        ref={contentRef}
        tabIndex={-1}
        role="document"
      >
        {children}
      </div>
    </div>
  )
}
