import { useState } from 'react'
import type { Tabla } from '../types'

interface Props {
  tablas: Tabla[]
  onSeleccionar: (tabla: Tabla) => void
  onAgregar: (nombre: string) => void
  onEliminar: (id: string) => void
}

export default function TablaSelector({ tablas, onSeleccionar, onAgregar, onEliminar }: Props) {
  const [nueva, setNueva] = useState('')

  const handleAgregar = () => {
    const nombre = nueva.trim()
    if (!nombre) return
    onAgregar(nombre)
    setNueva('')
  }

  return (
    <div className="tabla-selector">
      <div className="tabla-selector-header">
        <div className="tabla-selector-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <line x1="9" y1="12" x2="15" y2="12" />
            <line x1="9" y1="16" x2="13" y2="16" />
          </svg>
        </div>
        <div>
          <h1 className="tabla-selector-title">Gestión de Trabajos</h1>
          <p className="tabla-selector-sub">Elegí una tabla para comenzar o creá una nueva</p>
        </div>
      </div>

      <div className="tabla-selector-nueva">
        <input
          type="text"
          className="tabla-selector-input"
          placeholder="Nombre de nueva tabla"
          value={nueva}
          onChange={e => setNueva(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAgregar() }}
        />
        <button className="tabla-selector-btn" onClick={handleAgregar} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Crear tabla
        </button>
      </div>

      {tablas.length === 0 ? (
        <div className="tabla-selector-empty">
          <div className="empty-icon" style={{ color: 'var(--text-muted)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 44, height: 44 }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="empty-title">Sin tablas</p>
          <p className="empty-sub">Creá tu primera tabla arriba para empezar a registrar estudiantes.</p>
        </div>
      ) : (
        <div className="tabla-selector-grid">
          {tablas.map(t => (
            <div key={t.id} className="tabla-card" onClick={() => onSeleccionar(t)}>
              <div className="tabla-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </div>
              <div className="tabla-card-info">
                <span className="tabla-card-nombre">{t.nombre}</span>
                <span className="tabla-card-fecha">
                  {new Date(t.creadoEn).toLocaleDateString('es-CO')}
                </span>
              </div>
              <button
                className="tabla-card-del"
                title="Eliminar tabla"
                onClick={e => {
                  e.stopPropagation()
                  if (window.confirm(`¿Eliminar la tabla "${t.nombre}" y todos sus estudiantes? Esta acción no se puede deshacer.`)) {
                    onEliminar(t.id)
                  }
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
