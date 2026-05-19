import { Fragment, useState, useEffect } from 'react'
import type { Cliente, EstadoTrabajo } from '../types'
import { urgenciaCliente, unicaMateriaAccionable, formatVistoHace } from '../utils/urgencia'

interface Props {
  clientes: Cliente[]
  onAvanzarMateria: (clienteId: string, materiaId: string) => void
  onEditar: (cliente: Cliente) => void
  onEliminar: (id: string) => void
  onArchivar: (id: string) => void
  onDesarchivar: (id: string) => void
  onInteraccion: (id: string) => void
  onCopiar: (texto: string, etiqueta: string) => void
  destinoId?: string | null
  onLlegada?: () => void
}

const HOY = new Date()
HOY.setHours(0, 0, 0, 0)

type EstadoReal = EstadoTrabajo | 'vencido'

function getEstadoReal(m: { estado: EstadoTrabajo; fechaCierre: string }): EstadoReal {
  if (m.estado !== 'pendiente') return m.estado
  const cierre = new Date(m.fechaCierre + 'T00:00:00')
  if (cierre < HOY) return 'vencido'
  return 'pendiente'
}

function diasRestantes(fechaCierre: string): number {
  const cierre = new Date(fechaCierre + 'T00:00:00')
  return Math.round((cierre.getTime() - HOY.getTime()) / (1000 * 60 * 60 * 24))
}

function Countdown({ fechaCierre, estado }: { fechaCierre: string; estado: EstadoTrabajo }) {
  if (estado !== 'pendiente') return null
  const dias = diasRestantes(fechaCierre)

  if (dias < 0) {
    return <span className="countdown countdown--vencido">Venció hace {Math.abs(dias)} día{Math.abs(dias) !== 1 ? 's' : ''}</span>
  }
  if (dias === 0) return <span className="countdown countdown--hoy">¡Vence hoy!</span>
  if (dias <= 5)  return <span className="countdown countdown--urgente">⚠ {dias} día{dias !== 1 ? 's' : ''}</span>
  if (dias <= 15) return <span className="countdown countdown--pronto">{dias} días</span>
  return <span className="countdown countdown--ok">{dias} días</span>
}

function RevisarBadge({ estado, cargadoEn }: { estado: EstadoTrabajo; cargadoEn?: string }) {
  if (estado !== 'cargado') return null
  if (!cargadoEn) return <span className="revisar revisar--alerta">👀 Revisar si calificaron</span>
  const dias = Math.round((Date.now() - new Date(cargadoEn).getTime()) / (1000 * 60 * 60 * 24))
  if (dias < 1) return <span className="revisar revisar--ok">Cargado hoy</span>
  if (dias < 3) return <span className="revisar revisar--ok">Cargado hace {dias} día{dias !== 1 ? 's' : ''}</span>
  return <span className="revisar revisar--alerta">👀 Hace {dias} días — revisar</span>
}

const ESTADO_CONFIG: Record<EstadoReal, { label: string; clase: string; siguiente: string }> = {
  pendiente:  { label: 'Pendiente',  clase: 'badge--pendiente',  siguiente: '→ Marcar cargado' },
  cargado:    { label: 'Cargado',    clase: 'badge--cargado',    siguiente: '→ Marcar calificado' },
  calificado: { label: 'Calificado', clase: 'badge--calificado', siguiente: '↺ Resetear' },
  vencido:    { label: 'Vencido',    clase: 'badge--vencido',    siguiente: '→ Marcar cargado' },
}

function todasCalificadas(c: Cliente): boolean {
  return c.materias.length > 0 && c.materias.every(m => m.estado === 'calificado')
}

function formatFecha(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export default function ClienteTabla({ clientes, onAvanzarMateria, onEditar, onEliminar, onArchivar, onDesarchivar, onInteraccion, onCopiar, destinoId, onLlegada }: Props) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [resaltado, setResaltado] = useState<string | null>(null)

  const toggle = (id: string) => {
    let abriendo = false
    setExpandidos(prev => {
      const s = new Set(prev)
      if (s.has(id)) {
        s.delete(id)
      } else {
        s.add(id)
        abriendo = true
      }
      return s
    })
    if (abriendo) onInteraccion(id)
  }

  useEffect(() => {
    if (!destinoId) return
    setExpandidos(prev => {
      const s = new Set(prev)
      s.add(destinoId)
      return s
    })
    setResaltado(destinoId)
    requestAnimationFrame(() => {
      const el = document.getElementById(`cliente-${destinoId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    const t = setTimeout(() => setResaltado(null), 2000)
    onLlegada?.()
    return () => clearTimeout(t)
  }, [destinoId, onLlegada])

  return (
    <div className="tabla-wrapper">
      <table className="tabla">
        <thead>
          <tr>
            <th style={{ width: 42 }}>#</th>
            <th style={{ width: 32 }} />
            <th>Estudiante</th>
            <th>Usuario</th>
            <th>Contraseña</th>
            <th style={{ width: 60 }}>Mat.</th>
            <th>Urgencia</th>
            <th style={{ width: 220 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c, i) => {
            const abierto = expandidos.has(c.id)
            const listo   = todasCalificadas(c)
            const urg     = urgenciaCliente(c)
            const unica   = unicaMateriaAccionable(c)
            const visto   = formatVistoHace(c.actualizadoEn, c.creadoEn)

            return (
              <Fragment key={c.id}>
                <tr id={`cliente-${c.id}`} className={`tr-main tr-urg--${urg.nivel} ${abierto ? 'tr-main--open' : ''} ${c.archivado ? 'tr-main--archivado' : ''} ${resaltado === c.id ? 'tr-main--resaltado' : ''}`}
                  onClick={() => toggle(c.id)}>
                  <td className="td-num">{i + 1}</td>
                  <td className="td-arrow">{abierto ? '▾' : '▸'}</td>
                  <td className="td-nombre">
                    <div className="td-nombre-main">
                      {c.nombre || <span className="td-empty">Sin nombre</span>}
                      {c.archivado && <span className="badge-archivado">Archivado</span>}
                    </div>
                    {visto && <div className="td-visto">{visto}</div>}
                  </td>
                  <td>
                    <div className="cred-cell">
                      <code className="td-usuario">{c.usuario}</code>
                      <button className="copy-btn" onClick={e => { e.stopPropagation(); onCopiar(c.usuario, 'Usuario') }} title="Copiar usuario">📋</button>
                    </div>
                  </td>
                  <td>
                    <div className="cred-cell">
                      <code className="td-pass">{c.contrasena}</code>
                      <button className="copy-btn" onClick={e => { e.stopPropagation(); onCopiar(c.contrasena, 'Contraseña') }} title="Copiar contraseña">📋</button>
                    </div>
                  </td>
                  <td><span className="count-pill">{c.materias.length}</span></td>
                  <td className="td-urgencia">
                    <span className={`urg-pill urg-pill--${urg.nivel}`}>
                      <span className="urg-icon">{urg.icono}</span>
                      <span className="urg-text">{urg.texto}</span>
                    </span>
                  </td>
                  <td className="td-actions" onClick={e => e.stopPropagation()}>
                    {unica && !c.archivado && (
                      <button
                        className={`action-btn action-btn--quick action-btn--${unica.estado === 'pendiente' ? 'cargar' : 'calificar'}`}
                        onClick={() => onAvanzarMateria(c.id, unica.id)}
                        title={unica.estado === 'pendiente' ? 'Marcar como cargado' : 'Marcar como calificado'}
                      >
                        {unica.estado === 'pendiente' ? '⬆ Cargar' : '✓ Calificar'}
                      </button>
                    )}
                    <button className="action-btn action-btn--edit" onClick={() => onEditar(c)}>✏ Editar</button>
                    {listo && !c.archivado && (
                      <button className="action-btn action-btn--archive" onClick={() => onArchivar(c.id)} title="Archivar estudiante">
                        📁
                      </button>
                    )}
                    {c.archivado && (
                      <button className="action-btn action-btn--unarchive" onClick={() => onDesarchivar(c.id)} title="Desarchivar">
                        ↩
                      </button>
                    )}
                    <button className="action-btn action-btn--del" onClick={() => onEliminar(c.id)} title="Eliminar">✕</button>
                  </td>
                </tr>

                {abierto && c.materias.length === 0 && (
                  <tr className="tr-sub">
                    <td colSpan={8} className="td-empty-sub">
                      Sin materias — usa <strong>✏ Editar</strong> para agregar materias y tutores
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
                      <td className="td-materia">
                        {m.nombre}
                        {m.tutor && <div className="td-materia-tutor">👤 {m.tutor}</div>}
                      </td>
                      <td className="td-fecha">
                        <div>{formatFecha(m.fechaCierre)}</div>
                        <Countdown fechaCierre={m.fechaCierre} estado={m.estado} />
                        <RevisarBadge estado={m.estado} cargadoEn={m.cargadoEn} />
                      </td>
                      <td colSpan={3}>
                        <span className={`status-badge ${cfg.clase}`}>{cfg.label}</span>
                      </td>
                      <td className="td-actions">
                        <button
                          className={`action-btn action-btn--estado action-btn--${est === 'calificado' ? 'reset' : 'avanzar'}`}
                          onClick={() => onAvanzarMateria(c.id, m.id)}
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
