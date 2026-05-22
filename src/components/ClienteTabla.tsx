import { Fragment, useState, useEffect } from 'react'
import type { Cliente, EstadoTrabajo } from '../types'
import { urgenciaCliente, unicaMateriaAccionable, formatVistoHace } from '../utils/urgencia'

interface Props {
  clientes: Cliente[]
  onAvanzarMateria: (clienteId: string, materiaId: string) => void
  onCalificarTodo: (clienteId: string) => void
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
  const alertIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
  const checkIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )

  if (!cargadoEn) {
    return (
      <span className="revisar revisar--alerta">
        {alertIcon}Revisar si calificaron
      </span>
    )
  }
  const dias = Math.round((Date.now() - new Date(cargadoEn).getTime()) / (1000 * 60 * 60 * 24))
  if (dias < 1) {
    return (
      <span className="revisar revisar--ok">
        {checkIcon}Cargado hoy
      </span>
    )
  }
  if (dias < 3) {
    return (
      <span className="revisar revisar--ok">
        {checkIcon}Cargado hace {dias} día{dias !== 1 ? 's' : ''}
      </span>
    )
  }
  return (
    <span className="revisar revisar--alerta">
      {alertIcon}Hace {dias} días — revisar
    </span>
  )
}

const ESTADO_CONFIG: Record<EstadoReal, { label: string; clase: string; siguiente: string }> = {
  preinscrito: { label: 'Preinscrito', clase: 'badge--preinscrito', siguiente: '→ Marcar pendiente' },
  pendiente:   { label: 'Pendiente',   clase: 'badge--pendiente',   siguiente: '→ Marcar cargado' },
  cargado:     { label: 'Cargado',     clase: 'badge--cargado',     siguiente: '→ Marcar calificado' },
  calificado:  { label: 'Calificado',  clase: 'badge--calificado',  siguiente: '↺ Resetear' },
  vencido:     { label: 'Vencido',     clase: 'badge--vencido',     siguiente: '→ Marcar cargado' },
}

function todasCalificadas(c: Cliente): boolean {
  return c.materias.length > 0 && c.materias.every(m => m.estado === 'calificado')
}

function formatFecha(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export default function ClienteTabla({ clientes, onAvanzarMateria, onCalificarTodo, onEditar, onEliminar, onArchivar, onDesarchivar, onInteraccion, onCopiar, destinoId, onLlegada }: Props) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [resaltado, setResaltado] = useState<string | null>(null)

  const toggle = (id: string) => {
    let abriendo = false
    setExpandidos(prev => {
      if (prev.has(id)) return new Set<string>()
      abriendo = true
      return new Set<string>([id])
    })
    if (abriendo) onInteraccion(id)
  }

  useEffect(() => {
    if (!destinoId) return
    setExpandidos(new Set<string>([destinoId]))
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
                  <td className="td-arrow">
                    <svg className="td-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, display: 'inline-block', verticalAlign: 'middle' }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </td>
                  <td className="td-nombre">
                    <div className="td-nombre-main">
                      {c.nombre || <span className="td-empty">Sin nombre</span>}
                      {c.archivado && <span className="badge-archivado">Archivado</span>}
                    </div>
                    {visto && <div className="td-visto">{visto}</div>}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <code
                      className="td-usuario td-copiable"
                      onClick={() => onCopiar(c.usuario, 'Usuario')}
                      title="Click para copiar"
                    >
                      {c.usuario}
                      <svg className="copy-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, opacity: 0.7 }}>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </code>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <code
                      className="td-pass td-copiable"
                      onClick={() => onCopiar(c.contrasena, 'Contraseña')}
                      title="Click para copiar"
                    >
                      {c.contrasena}
                      <svg className="copy-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, opacity: 0.7 }}>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </code>
                  </td>
                  <td><span className="count-pill">{c.materias.length}</span></td>
                  <td className="td-urgencia">
                    <span className={`urg-pill urg-pill--${urg.nivel}`}>
                      <span className={`urg-dot urg-dot--${urg.nivel}`} />
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
                        {unica.estado === 'pendiente' ? (
                          <>
                            <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, marginRight: 4 }}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            Cargar
                          </>
                        ) : (
                          <>
                            <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, marginRight: 4 }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Calificar
                          </>
                        )}
                      </button>
                    )}
                    {!c.archivado && (
                      <button
                        className={`action-btn ${listo ? 'action-btn--reset-todo' : 'action-btn--calificar-todo'}`}
                        onClick={() => onCalificarTodo(c.id)}
                        title={listo ? 'Volver todas las materias a pendiente' : 'Marcar todas las materias como calificadas'}
                      >
                        {listo ? (
                          <>
                            <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, marginRight: 4 }}>
                              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                            </svg>
                            Resetear todo
                          </>
                        ) : (
                          <>
                            <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, marginRight: 4 }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Calificar todo
                          </>
                        )}
                      </button>
                    )}
                    <button className="action-btn action-btn--edit" onClick={() => onEditar(c)}>
                      <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, marginRight: 4 }}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Editar
                    </button>
                    {listo && !c.archivado && (
                      <button className="action-btn action-btn--archive" onClick={() => onArchivar(c.id)} title="Archivar estudiante">
                        <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                      </button>
                    )}
                    {c.archivado && (
                      <button className="action-btn action-btn--unarchive" onClick={() => onDesarchivar(c.id)} title="Desarchivar">
                        <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1.05 10" />
                        </svg>
                      </button>
                    )}
                    <button className="action-btn action-btn--del" onClick={() => onEliminar(c.id)} title="Eliminar">
                      <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
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
                      <td className="td-arrow td-arrow--sub" />
                      <td className="td-materia">
                        {m.nombre}
                        {m.tutor && (
                          <div className="td-materia-tutor" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--text-muted)' }}>
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            {m.tutor}
                          </div>
                        )}
                      </td>
                      <td className="td-fecha">
                        {m.fechaCierre ? (
                          <>
                            <div>{formatFecha(m.fechaCierre)}</div>
                            <Countdown fechaCierre={m.fechaCierre} estado={m.estado} />
                          </>
                        ) : (
                          <span className="td-empty">Sin fecha</span>
                        )}
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
                          {est === 'calificado' ? (
                            <>
                              <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }}>
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                              </svg>
                              Resetear
                            </>
                          ) : (
                            <>
                              <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }}>
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                              {est === 'preinscrito' ? 'Marcar pendiente' : est === 'pendiente' || est === 'vencido' ? 'Marcar cargado' : 'Marcar calificado'}
                            </>
                          )}
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
