import { useState } from 'react'
import type { Seccion } from '../types'

interface Props {
  secciones: Seccion[]
  onCerrar: () => void
  onAgregar: (nombre: string) => void
  onRenombrar: (id: string, nombre: string) => void
  onEliminar: (id: string) => void
}

export default function SeccionManager({ secciones, onCerrar, onAgregar, onRenombrar, onEliminar }: Props) {
  const [nueva, setNueva] = useState('')
  const [editando, setEditando] = useState<Record<string, string>>({})

  const handleAgregar = () => {
    const nombre = nueva.trim()
    if (!nombre) return
    onAgregar(nombre)
    setNueva('')
  }

  const handleRenombrar = (id: string) => {
    const nombre = editando[id]?.trim()
    if (!nombre) return
    onRenombrar(id, nombre)
    setEditando(prev => { const copy = { ...prev }; delete copy[id]; return copy })
  }

  const handleEliminar = (id: string, nombre: string) => {
    if (!window.confirm(`¿Eliminar la sección "${nombre}"? Los estudiantes asignados quedarán sin sección.`)) return
    onEliminar(id)
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">🏷 Administrar secciones</h3>
          <button className="modal-close" onClick={onCerrar}>✕</button>
        </div>

        <div className="modal-body">
          <p className="modal-hint">Creá pestañas para agrupar estudiantes (ej: SENA, DINAED, etc.)</p>

          <div className="seccion-nueva">
            <input
              type="text"
              className="seccion-input"
              placeholder="Nombre de nueva sección..."
              value={nueva}
              onChange={e => setNueva(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAgregar() }}
            />
            <button className="seccion-btn-agregar" onClick={handleAgregar}>＋ Agregar</button>
          </div>

          {secciones.length === 0 ? (
            <p className="seccion-vacia">Aún no hay secciones. Agregá la primera arriba.</p>
          ) : (
            <ul className="seccion-lista">
              {secciones.map(s => {
                const enEdicion = s.id in editando
                return (
                  <li key={s.id} className="seccion-item">
                    {enEdicion ? (
                      <input
                        type="text"
                        className="seccion-input"
                        value={editando[s.id]}
                        onChange={e => setEditando(prev => ({ ...prev, [s.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleRenombrar(s.id) }}
                        autoFocus
                      />
                    ) : (
                      <span className="seccion-nombre">{s.nombre}</span>
                    )}

                    <div className="seccion-acciones">
                      {enEdicion ? (
                        <>
                          <button className="seccion-btn-ok" onClick={() => handleRenombrar(s.id)} title="Guardar">✓</button>
                          <button className="seccion-btn-cancel" onClick={() => setEditando(prev => { const copy = { ...prev }; delete copy[s.id]; return copy })} title="Cancelar">↩</button>
                        </>
                      ) : (
                        <>
                          <button className="seccion-btn-edit" onClick={() => setEditando(prev => ({ ...prev, [s.id]: s.nombre }))} title="Renombrar">✏</button>
                          <button className="seccion-btn-del" onClick={() => handleEliminar(s.id, s.nombre)} title="Eliminar">✕</button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
