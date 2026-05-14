import { Fragment, useState } from 'react'
import type { Cliente, EstadoTrabajo } from '../types'

interface Props {
  clientes: Cliente[]
  onAvanzarMateria: (clienteId: string, materiaId: string) => void
  onEditar: (cliente: Cliente) => void
  onEliminar: (id: string) => void
}

const HOY = new Date().toISOString().split('T')[0]

type EstadoReal = EstadoTrabajo | 'vencido'

function getEstadoReal(m: { estado: EstadoTrabajo; fechaCierre: string }): EstadoReal {
  if (m.estado !== 'pendiente') return m.estado
  if (m.fechaCierre < HOY) return 'vencido'
  return 'pendiente'
}

const ESTADO_CONFIG: Record<EstadoReal, { label: string; clase: string; siguiente: string }> = {
  pendiente:  { label: 'Pendiente',   clase: 'badge--pendiente',  siguiente: '→ Marcar cargado' },
  cargado:    { label: 'Cargado',     clase: 'badge--cargado',    siguiente: '→ Marcar calificado' },
  calificado: { label: 'Calificado',  clase: 'badge--calificado', siguiente: '↺ Resetear' },
  vencido:    { label: 'Vencido',     clase: 'badge--vencido',    siguiente: '→ Marcar cargado' },
}

function resumenCliente(c: Cliente) {
  if (c.materias.length === 0) return { label: 'Sin materias', clase: 'resumen--sin' }
  const vencidas    = c.materias.filter(m => m.estado === 'pendiente' && m.fechaCierre < HOY).length
  const calificadas = c.materias.filter(m => m.estado === 'calificado').length
  const cargadas    = c.materias.filter(m => m.estado === 'cargado').length
  const total       = c.materias.length
  if (vencidas > 0)           return { label: `${vencidas} vencida${vencidas > 1 ? 's' : ''}`, clase: 'resumen--vencido' }
  if (calificadas === total)  return { label: 'Todas calificadas', clase: 'resumen--calificado' }
  if (cargadas > 0)           return { label: `${cargadas} cargada${cargadas > 1 ? 's' : ''}`, clase: 'resumen--cargado' }
  return { label: 'Sin iniciar', clase: 'resumen--pendiente' }
}

function formatFecha(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export default function ClienteTabla({ clientes, onAvanzarMateria, onEditar, onEliminar }: Props) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpandidos(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })

  return (
    <div className="tabla-wrapper">
      <table className="tabla">
        <thead>
          <tr>
            <th style={{ width: 42 }}>#</th>
            <th style={{ width: 32 }} />
            <th>Estudiante</th>
            <th>Usuario</th>
            <th>Tutor</th>
            <th>Materias</th>
            <th>Estado</th>
            <th style={{ width: 140 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c, i) => {
            const abierto = expandidos.has(c.id)
            const resumen = resumenCliente(c)

            return (
              <Fragment key={c.id}>
                <tr className={`tr-main ${abierto ? 'tr-main--open' : ''}`} onClick={() => toggle(c.id)}>
                  <td className="td-num">{i + 1}</td>
                  <td className="td-arrow">{abierto ? '▾' : '▸'}</td>
                  <td className="td-nombre">{c.nombre || <span className="td-empty">Sin nombre</span>}</td>
                  <td><code className="td-usuario">{c.usuario}</code></td>
                  <td className="td-tutor">{c.tutor || <span className="td-empty">—</span>}</td>
                  <td className="td-count">
                    <span className="count-pill">{c.materias.length}</span>
                  </td>
                  <td>
                    <span className={`resumen-badge ${resumen.clase}`}>{resumen.label}</span>
                  </td>
                  <td className="td-actions" onClick={e => e.stopPropagation()}>
                    <button className="action-btn action-btn--edit" onClick={() => onEditar(c)} title="Editar">
                      ✏ Editar
                    </button>
                    <button className="action-btn action-btn--del" onClick={() => onEliminar(c.id)} title="Eliminar">
                      ✕
                    </button>
                  </td>
                </tr>

                {abierto && c.materias.length === 0 && (
                  <tr className="tr-sub">
                    <td colSpan={8} className="td-empty-sub">
                      Sin materias — usa <strong>✏ Editar</strong> para agregar tutor y materias
                    </td>
                  </tr>
                )}

                {abierto && c.materias.map(m => {
                  const est = getEstadoReal(m)
                  const cfg = ESTADO_CONFIG[est]
                  return (
                    <tr key={m.id} className="tr-sub">
                      <td className="td-num td-num--sub" />
                      <td className="td-arrow td-arrow--sub">↳</td>
                      <td colSpan={2} className="td-materia">{m.nombre}</td>
                      <td className="td-fecha">{formatFecha(m.fechaCierre)}</td>
                      <td colSpan={2}>
                        <span className={`status-badge ${cfg.clase}`}>{cfg.label}</span>
                      </td>
                      <td className="td-actions">
                        <button
                          className={`action-btn action-btn--estado action-btn--${est === 'calificado' ? 'reset' : 'avanzar'}`}
                          onClick={() => onAvanzarMateria(c.id, m.id)}
                          title={cfg.siguiente}
                        >
                          {cfg.siguiente}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
