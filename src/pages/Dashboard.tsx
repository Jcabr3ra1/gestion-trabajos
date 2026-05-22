import { useState, useEffect, useRef } from 'react'
import type { Cliente } from '../types'
import {
  suscribirClientes, eliminarCliente,
  avanzarEstadoMateria, archivarCliente, desarchivarCliente,
  importarCredenciales, marcarReciente, calificarTodoMaterias,
} from '../utils/storage'
import { exportarCredenciales, parsearExcelCredenciales, descargarPlantilla } from '../utils/excel'
import { urgenciaCliente, getAtencion } from '../utils/urgencia'
import ClienteTabla from '../components/ClienteTabla'

interface Props {
  tablaId: string
  onAgregar: () => void
  onEditar: (cliente: Cliente) => void
}

type Filtro = 'activos' | 'vencidos' | 'cargados' | 'calificados' | 'archivados'

const HOY = new Date()
HOY.setHours(0, 0, 0, 0)

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
  const totalAtencion = atencion.vencidas.length + atencion.proximas.length + atencion.revisar.length
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
    if (!cliente || cliente.materias.length === 0) return
    if (!window.confirm('¿Marcar TODAS las materias de este estudiante como calificadas?')) return
    await calificarTodoMaterias(clienteId, cliente.materias, tablaId)
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
            <span className="atencion-icon">📌</span>
            <h2 className="atencion-title">Atención hoy</h2>
            <span className="atencion-count">{totalAtencion}</span>
          </div>

          {atencion.vencidas.length > 0 && (
            <div className="atencion-grupo atencion-grupo--vencida">
              <div className="atencion-grupo-header">
                🔴 Vencidas <span className="atencion-grupo-count">({atencion.vencidas.length})</span>
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
                ⚠ Por vencer <span className="atencion-grupo-count">({atencion.proximas.length})</span>
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
                👀 Revisar si calificaron <span className="atencion-grupo-count">({atencion.revisar.length})</span>
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
        </div>
      ) : hayActivos && (
        <div className="todo-al-dia">
          <span className="todo-al-dia-icon">🎉</span>
          <div>
            <h2 className="todo-al-dia-title">Todo al día</h2>
            <p className="todo-al-dia-sub">No tenés materias vencidas, por vencer ni pendientes de revisar.</p>
          </div>
        </div>
      )}

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon stat-icon--blue">👥</div>
          <div className="stat-info">
            <span className="stat-num">{stats.estudiantes}</span>
            <span className="stat-lbl">Estudiantes</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--gray">○</div>
          <div className="stat-info">
            <span className="stat-num">{stats.pendientes}</span>
            <span className="stat-lbl">Pendientes</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--blue2">⬆</div>
          <div className="stat-info">
            <span className="stat-num">{stats.cargadas}</span>
            <span className="stat-lbl">Cargadas</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--green">✓</div>
          <div className="stat-info">
            <span className="stat-num">{stats.calificadas}</span>
            <span className="stat-lbl">Calificadas</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--red">!</div>
          <div className="stat-info">
            <span className="stat-num stat-num--vencido">{stats.vencidas}</span>
            <span className="stat-lbl">Vencidas</span>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn-nuevo" onClick={onAgregar}>＋ Nuevo estudiante</button>
          <button className="btn-xl btn-xl--export" onClick={handleExportar} title="Exportar usuario y contraseña a Excel">
            ↓ Exportar Excel
          </button>
          <button
            className="btn-xl btn-xl--import"
            onClick={() => inputArchivoRef.current?.click()}
            disabled={importando}
            title="Importar contraseñas desde Excel"
          >
            {importando ? 'Importando…' : '↑ Importar Excel'}
          </button>
          <button className="btn-xl btn-xl--template" onClick={descargarPlantilla} title="Descargar plantilla Excel vacía">
            ▤ Plantilla
          </button>
          <input
            ref={inputArchivoRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleImportar}
          />
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
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
            ['vencidos',    '⚠ Vencidos'],
            ['cargados',    '⬆ Cargados'],
            ['calificados', '✓ Calificados'],
            ['archivados',  `📁 Archivados${stats.archivados > 0 ? ` (${stats.archivados})` : ''}`],
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
              ? <><div className="empty-icon">📋</div><p className="empty-title">Sin estudiantes</p><p className="empty-sub">Haz clic en <strong>＋ Nuevo estudiante</strong> para comenzar.</p></>
              : filtro === 'archivados'
              ? <><div className="empty-icon">📁</div><p className="empty-title">Sin archivados</p><p className="empty-sub">Los estudiantes con todas las materias calificadas aparecerán aquí.</p></>
              : <><div className="empty-icon">🔍</div><p className="empty-title">Sin resultados</p><p className="empty-sub">No se encontró "<strong>{busqueda}</strong>".</p></>
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
          <span className="toast-icon">{toast.tipo === 'ok' ? '✓' : '⚠'}</span>
          <span className="toast-msg">{toast.mensaje}</span>
          <button className="toast-close" onClick={() => setToast(null)}>✕</button>
        </div>
      )}
    </div>
  )
}
