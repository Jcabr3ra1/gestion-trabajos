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
        <span className="tabla-selector-logo">📋</span>
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
        <button className="tabla-selector-btn" onClick={handleAgregar}>＋ Crear tabla</button>
      </div>

      {tablas.length === 0 ? (
        <div className="tabla-selector-empty">
          <div className="empty-icon">📂</div>
          <p className="empty-title">Sin tablas</p>
          <p className="empty-sub">Creá tu primera tabla arriba para empezar a registrar estudiantes.</p>
        </div>
      ) : (
        <div className="tabla-selector-grid">
          {tablas.map(t => (
            <div key={t.id} className="tabla-card" onClick={() => onSeleccionar(t)}>
              <div className="tabla-card-icon">📊</div>
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
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
