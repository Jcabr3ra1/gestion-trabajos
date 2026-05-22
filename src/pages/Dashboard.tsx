import { useState, useEffect, useRef } from 'react'
import type { Cliente } from '../types'
import {
  suscribirClientes, eliminarCliente, actualizarCliente,
  avanzarEstadoMateria, archivarCliente, desarchivarCliente,
  importarCredenciales, marcarReciente, calificarTodoMaterias, resetearTodoMaterias,
} from '../utils/storage'
import { exportarCredenciales, parsearExcelCredenciales, descargarPlantilla } from '../utils/excel'
import { urgenciaCliente, getAtencion } from '../utils/urgencia'
import ClienteTabla from '../components/ClienteTabla'
import Menu from '../components/Menu'

interface Props {
  tablaId: string
  onAgregar: () => void
  onEditar: (cliente: Cliente) => void
}

type Filtro = 'activos' | 'vencidos' | 'cargados' | 'calificados' | 'archivados'

const HOY = new Date()
HOY.setHours(0, 0, 0, 0)

/* ── Iconos del menú de Excel ── */
const iconExportar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)
const iconImportar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)
const iconPlantilla = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
)

export default function Dashboard({ tablaId, onAgregar, onEditar }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('activos')
  const [importando, setImportando] = useState(false)
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err'; mensaje: string } | null>(null)
  const [destinoId, setDestinoId] = useState<string | null>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)

  const irACliente = (id: string) => setDestinoId(id)

  const mostrarToast = (tipo: 'ok' | 'err', mensaje: string) => {
    setToast({ tipo, mensaje })
    setTimeout(() => setToast(null), 4500)
  }

  useEffect(() => {
    setCargando(true)
    const unsub = suscribirClientes(data => {
      setClientes(data)
      setCargando(false)
    }, tablaId)
    return unsub
  }, [tablaId])

  // ordenar por urgencia (vencidas > urgentes > revisar > normal > completo)
  // empate: por interacción más reciente
  const ordenados = [...clientes].sort((a, b) => {
    const ua = urgenciaCliente(a)
    const ub = urgenciaCliente(b)
    if (ua.score !== ub.score) return ub.score - ua.score
    const ta = a.actualizadoEn ?? a.creadoEn
    const tb = b.actualizadoEn ?? b.creadoEn
    return tb.localeCompare(ta)
  })

  const atencion = getAtencion(clientes)
  const totalAtencion = atencion.vencidas.length + atencion.proximas.length + atencion.revisar.length + atencion.preinscritas.length
  const hayActivos = clientes.some(c => !c.archivado)

  const activos = ordenados.filter(c => !c.archivado)
  const todasMaterias = activos.flatMap(c => c.materias)

  const stats = {
    estudiantes: activos.length,
    pendientes:  todasMaterias.filter(m => m.estado === 'pendiente' && new Date(m.fechaCierre + 'T00:00:00') >= HOY).length,
    cargadas:    todasMaterias.filter(m => m.estado === 'cargado').length,
    calificadas: todasMaterias.filter(m => m.estado === 'calificado').length,
    vencidas:    todasMaterias.filter(m => m.estado === 'pendiente' && new Date(m.fechaCierre + 'T00:00:00') < HOY).length,
    archivados:  ordenados.filter(c => c.archivado).length,
  }

  const filtrados = ordenados.filter(c => {
    const txt = busqueda.toLowerCase()
    const coincide =
      c.nombre.toLowerCase().includes(txt) ||
      c.usuario.toLowerCase().includes(txt) ||
      c.materias.some(m => (m.tutor ?? '').toLowerCase().includes(txt))
    if (!coincide) return false
    if (filtro === 'archivados') return c.archivado
    if (c.archivado) return false
    if (filtro === 'vencidos')    return c.materias.some(m => m.estado === 'pendiente' && new Date(m.fechaCierre + 'T00:00:00') < HOY)
    if (filtro === 'cargados')    return c.materias.some(m => m.estado === 'cargado')
    if (filtro === 'calificados') return c.materias.length > 0 && c.materias.every(m => m.estado === 'calificado')
    return true
  })

  const handleAvanzar = async (clienteId: string, materiaId: string) => {
    const cliente = clientes.find(c => c.id === clienteId)
    if (!cliente) return
    await avanzarEstadoMateria(clienteId, materiaId, cliente.materias, tablaId)
  }

  const handleCalificarTodo = async (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId)
    if (!cliente) return
    const materias = cliente.materias ?? []

    if (materias.length === 0) {
      if (!window.confirm('Este estudiante no tiene materias registradas. ¿Marcar como completado de todos modos?')) return
      const hoy = new Date().toISOString().split('T')[0]
      await actualizarCliente(clienteId, {
        materias: [{
          id: crypto.randomUUID(),
          nombre: 'Trabajos',
          fechaCierre: hoy,
          estado: 'calificado' as const,
          tutor: '',
          cargadoEn: new Date().toISOString(),
        }],
      }, tablaId)
      mostrarToast('ok', 'Estudiante marcado como completado')
      return
    }

    const todasCalificadas = materias.every(m => m.estado === 'calificado')
    if (todasCalificadas) {
      if (!window.confirm('¿Volver TODAS las materias de este estudiante a PENDIENTE?')) return
      await resetearTodoMaterias(clienteId, materias, tablaId)
    } else {
      if (!window.confirm('¿Marcar TODAS las materias de este estudiante como CALIFICADAS?')) return
      await calificarTodoMaterias(clienteId, materias, tablaId)
    }
  }

  const handleEliminar = async (id: string) => {
    if (!window.confirm('¿Eliminar este estudiante y todas sus materias?')) return
    await eliminarCliente(id, tablaId)
  }

  const handleArchivar   = async (id: string) => { await archivarCliente(id, tablaId) }
  const handleDesarchivar = async (id: string) => { await desarchivarCliente(id, tablaId) }
  const handleInteraccion = (id: string) => { void marcarReciente(id, tablaId) }

  const handleCopiar = async (texto: string, etiqueta: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      mostrarToast('ok', `${etiqueta} copiado`)
    } catch {
      mostrarToast('err', 'No se pudo copiar al portapapeles')
    }
  }

  const handleExportar = () => {
    const activos = clientes.filter(c => !c.archivado)
    exportarCredenciales(activos)
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    e.target.value = ''
    setImportando(true)
    try {
      const pares = await parsearExcelCredenciales(archivo)
      if (pares.length === 0) {
        mostrarToast('err', 'No se encontraron filas válidas. Verificá las columnas "Usuario" y "Contraseña".')
        return
      }
      const { actualizados, creados } = await importarCredenciales(pares, tablaId)
      const partes: string[] = []
      if (creados > 0)      partes.push(`${creados} creado${creados !== 1 ? 's' : ''}`)
      if (actualizados > 0) partes.push(`${actualizados} actualizado${actualizados !== 1 ? 's' : ''}`)
      mostrarToast('ok', partes.length > 0 ? `Importación lista: ${partes.join(', ')}.` : 'No se importó ninguna credencial.')
    } catch (err) {
      mostrarToast('err', (err as Error).message)
    } finally {
      setImportando(false)
    }
  }

  if (cargando) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <p>Cargando datos...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {totalAtencion > 0 ? (
        <div className="atencion">
          <div className="atencion-header">
            <span className="atencion-title-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, color: 'var(--brand-primary)' }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </span>
            <h2 className="atencion-title">Atención hoy</h2>
            <span className="atencion-count">{totalAtencion}</span>
          </div>

          <div className="atencion-grid">
            {atencion.vencidas.length > 0 && (
              <div className="atencion-grupo atencion-grupo--vencida">
                <div className="atencion-grupo-header">
                  <span className="atencion-dot atencion-dot--vencida" />
                  Vencidas <span className="atencion-grupo-count">({atencion.vencidas.length})</span>
                </div>
                <ul className="atencion-lista">
                  {atencion.vencidas.slice(0, 5).map(it => (
                    <li key={it.materia.id} className="atencion-item" onClick={() => irACliente(it.cliente.id)}>
                      <div className="atencion-item-main">
                        <span className="atencion-est">{it.cliente.nombre || it.cliente.usuario}</span>
                        <span className="atencion-mat">{it.materia.nombre}</span>
                      </div>
                      <span className="atencion-det atencion-det--vencida">{it.detalle}</span>
                    </li>
                  ))}
                  {atencion.vencidas.length > 5 && (
                    <li className="atencion-mas">y {atencion.vencidas.length - 5} más…</li>
                  )}
                </ul>
              </div>
            )}

            {atencion.proximas.length > 0 && (
              <div className="atencion-grupo atencion-grupo--urgente">
                <div className="atencion-grupo-header">
                  <span className="atencion-dot atencion-dot--urgente" />
                  Por vencer <span className="atencion-grupo-count">({atencion.proximas.length})</span>
                </div>
                <ul className="atencion-lista">
                  {atencion.proximas.slice(0, 5).map(it => (
                    <li key={it.materia.id} className="atencion-item" onClick={() => irACliente(it.cliente.id)}>
                      <div className="atencion-item-main">
                        <span className="atencion-est">{it.cliente.nombre || it.cliente.usuario}</span>
                        <span className="atencion-mat">{it.materia.nombre}</span>
                      </div>
                      <span className="atencion-det atencion-det--urgente">{it.detalle}</span>
                    </li>
                  ))}
                  {atencion.proximas.length > 5 && (
                    <li className="atencion-mas">y {atencion.proximas.length - 5} más…</li>
                  )}
                </ul>
              </div>
            )}

            {atencion.revisar.length > 0 && (
              <div className="atencion-grupo atencion-grupo--revisar">
                <div className="atencion-grupo-header">
                  <span className="atencion-dot atencion-dot--revisar" />
                  Revisar si calificaron <span className="atencion-grupo-count">({atencion.revisar.length})</span>
                </div>
                <ul className="atencion-lista">
                  {atencion.revisar.slice(0, 5).map(it => (
                    <li key={it.materia.id} className="atencion-item" onClick={() => irACliente(it.cliente.id)}>
                      <div className="atencion-item-main">
                        <span className="atencion-est">{it.cliente.nombre || it.cliente.usuario}</span>
                        <span className="atencion-mat">{it.materia.nombre}</span>
                      </div>
                      <span className="atencion-det atencion-det--revisar">{it.detalle}</span>
                    </li>
                  ))}
                  {atencion.revisar.length > 5 && (
                    <li className="atencion-mas">y {atencion.revisar.length - 5} más…</li>
                  )}
                </ul>
              </div>
            )}

            {atencion.preinscritas.length > 0 && (
              <div className="atencion-grupo atencion-grupo--preinscrito">
                <div className="atencion-grupo-header">
                  <span className="atencion-dot atencion-dot--preinscrito" />
                  Preinscritos por activar <span className="atencion-grupo-count">({atencion.preinscritas.length})</span>
                </div>
                <ul className="atencion-lista">
                  {atencion.preinscritas.slice(0, 5).map(it => (
                    <li key={it.materia.id} className="atencion-item" onClick={() => irACliente(it.cliente.id)}>
                      <div className="atencion-item-main">
                        <span className="atencion-est">{it.cliente.nombre || it.cliente.usuario}</span>
                        <span className="atencion-mat">{it.materia.nombre}</span>
                      </div>
                      <span className="atencion-det atencion-det--preinscrito">{it.detalle}</span>
                    </li>
                  ))}
                  {atencion.preinscritas.length > 5 && (
                    <li className="atencion-mas">y {atencion.preinscritas.length - 5} más…</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : hayActivos && (
        <div className="todo-al-dia">
          <span className="todo-al-dia-icon" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--brand-primary)' }}>
            <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </span>
          <div>
            <h2 className="todo-al-dia-title">Todo al día</h2>
            <p className="todo-al-dia-sub">No hay materias vencidas, por vencer, para revisar ni preinscripciones por activar.</p>
          </div>
        </div>
      )}

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon stat-icon--blue" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-num">{stats.estudiantes}</span>
            <span className="stat-lbl">Estudiantes</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--gray" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-num">{stats.pendientes}</span>
            <span className="stat-lbl">Pendientes</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--blue2" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-num">{stats.cargadas}</span>
            <span className="stat-lbl">Cargadas</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--green" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-num">{stats.calificadas}</span>
            <span className="stat-lbl">Calificadas</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--red" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-num stat-num--vencido">{stats.vencidas}</span>
            <span className="stat-lbl">Vencidas</span>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn-nuevo" onClick={onAgregar}>
            <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Nuevo estudiante
          </button>
          <Menu
            className="btn-xl btn-xl--excel"
            align="start"
            disabled={importando}
            title="Exportar, importar o descargar plantilla de Excel"
            ariaLabel="Opciones de Excel"
            items={[
              { label: 'Exportar a Excel', icon: iconExportar, onClick: handleExportar },
              { label: 'Importar desde Excel', icon: iconImportar, onClick: () => inputArchivoRef.current?.click() },
              { label: 'Descargar plantilla', icon: iconPlantilla, onClick: descargarPlantilla },
            ]}
          >
            <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="3" y1="15" x2="21" y2="15"></line>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="15" y1="3" x2="15" y2="21"></line>
            </svg>
            {importando ? 'Importando…' : 'Excel'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, marginLeft: 2 }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </Menu>
          <input
            ref={inputArchivoRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleImportar}
          />
          <div className="search-wrap">
            <span className="search-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              className="search-input"
              type="search"
              placeholder="Buscar por nombre, usuario o tutor de materia..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
        </div>
        <div className="filtros">
          {([
            ['activos',     'Activos'],
            ['vencidos',    'Vencidos'],
            ['cargados',    'Cargados'],
            ['calificados', 'Calificados'],
            ['archivados',  `Archivados${stats.archivados > 0 ? ` (${stats.archivados})` : ''}`],
          ] as [Filtro, string][]).map(([f, label]) => (
            <button
              key={f}
              className={`filtro-btn ${filtro === f ? 'filtro-btn--active' : ''} ${f === 'archivados' ? 'filtro-btn--arch' : ''}`}
              onClick={() => setFiltro(f)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="tabla-container">
        {filtrados.length === 0 ? (
          <div className="empty-state">
            {activos.length === 0
              ? <>
                  <div className="empty-icon" style={{ color: 'var(--text-muted)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48 }}>
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                  </div>
                  <p className="empty-title">Sin estudiantes</p>
                  <p className="empty-sub">Haz clic en <strong>Nuevo estudiante</strong> para comenzar.</p>
                </>
              : filtro === 'archivados'
              ? <>
                  <div className="empty-icon" style={{ color: 'var(--text-muted)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48 }}>
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <p className="empty-title">Sin archivados</p>
                  <p className="empty-sub">Los estudiantes con todas las materias calificadas aparecerán aquí.</p>
                </>
              : <>
                  <div className="empty-icon" style={{ color: 'var(--text-muted)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48 }}>
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <p className="empty-title">Sin resultados</p>
                  <p className="empty-sub">No se encontró "<strong>{busqueda}</strong>".</p>
                </>
            }
          </div>
        ) : (
          <ClienteTabla
            clientes={filtrados}
            onAvanzarMateria={handleAvanzar}
            onCalificarTodo={handleCalificarTodo}
            onEditar={onEditar}
            onEliminar={handleEliminar}
            onArchivar={handleArchivar}
            onDesarchivar={handleDesarchivar}
            onInteraccion={handleInteraccion}
            onCopiar={handleCopiar}
            destinoId={destinoId}
            onLlegada={() => setDestinoId(null)}
          />
        )}
      </div>

      {filtrados.length > 0 && (
        <div className="status-bar">
          {filtrados.length} de {activos.length} estudiante{activos.length !== 1 ? 's' : ''}
        </div>
      )}

      {toast && (
        <div className={`toast toast--${toast.tipo}`}>
          <span className="toast-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
            {toast.tipo === 'ok' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </span>
          <span className="toast-msg">{toast.mensaje}</span>
          <button className="toast-close" onClick={() => setToast(null)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
