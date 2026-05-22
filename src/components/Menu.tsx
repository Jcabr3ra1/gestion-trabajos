import { useState, useRef, useLayoutEffect, type ReactNode } from 'react'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  danger?: boolean
}

interface Props {
  items: MenuItem[]
  /** Alinea el panel al inicio (izquierda) o al final (derecha) del botón */
  align?: 'start' | 'end'
  className?: string
  title?: string
  ariaLabel?: string
  disabled?: boolean
  /** Contenido del botón que abre el menú */
  children: ReactNode
}

interface Pos { top?: number; bottom?: number; left?: number; right?: number }

export default function Menu({
  items, align = 'end', className = '', title, ariaLabel, disabled = false, children,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Pos>({ top: -9999, left: -9999 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open) return

    const ubicar = () => {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const alto = items.length * 42 + 16
      // si no cabe abajo y sí arriba, lo abrimos hacia arriba
      const arriba = r.bottom + alto > window.innerHeight - 8 && r.top - alto > 8
      setPos({
        ...(arriba
          ? { bottom: window.innerHeight - r.top + 6 }
          : { top: r.bottom + 6 }),
        ...(align === 'end'
          ? { right: Math.max(8, window.innerWidth - r.right) }
          : { left: Math.max(8, r.left) }),
      })
    }

    ubicar()

    const clicFuera = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const cerrar = () => setOpen(false)

    document.addEventListener('mousedown', clicFuera)
    document.addEventListener('keydown', tecla)
    window.addEventListener('scroll', cerrar, true)
    window.addEventListener('resize', cerrar)
    return () => {
      document.removeEventListener('mousedown', clicFuera)
      document.removeEventListener('keydown', tecla)
      window.removeEventListener('scroll', cerrar, true)
      window.removeEventListener('resize', cerrar)
    }
  }, [open, align, items.length])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={className}
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
      >
        {children}
      </button>
      {open && (
        <div
          ref={panelRef}
          className="menu-panel"
          role="menu"
          style={pos}
          onClick={e => e.stopPropagation()}
        >
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              className={`menu-item${it.danger ? ' menu-item--danger' : ''}`}
              onClick={() => { setOpen(false); it.onClick() }}
            >
              {it.icon && <span className="menu-item-icon">{it.icon}</span>}
              <span className="menu-item-label">{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
