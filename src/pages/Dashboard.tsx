import { useState, useEffect, useRef } from 'react'
import type { Cliente } from '../types'
import {
  suscribirClientes, eliminarCliente,
  avanzarEstadoMateria, archivarCliente, desarchivarCliente,
  importarCredenciales, marcarReciente,
} from '../utils/storage'
import { exportarCredenciales, parsearExcelCredenciales, descargarPlantilla } from '../utils/excel'
import ClienteTabla from '../components/ClienteTabla'

interface Props {
  onAgregar: () => void
  onEditar: (cliente: Cliente) => void
}

type Filtro = 'activos' | 'vencidos' | 'cargados' | 'calificados' | 'archivados'

const HOY = new Date()
HOY.setHours(0, 0, 0, 0)

export default function Dashboard({ onAgregar, onEditar }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('activos')
  const [importando, setImportando] = useState(false)
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err'; mensaje: string } | null>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)

  const mostrarToast = (tipo: 'ok' | 'err', mensaje: string) => {
    setToast({ tipo, mensaje })
    setTimeout(() => setToast(null), 4500)
  }

  useEffect(() => {
    const unsub = suscribirClientes(data => {
      setClientes(data)
      setCargando(false)
    })
    return unsub
  }, [])

  // ordenar por interacción más reciente (recientes arriba)
  const ordenados = [...clientes].sort((a, b) => {
    const ta = a.actualizadoEn ?? a.creadoEn
    const tb = b.actualizadoEn ?? b.creadoEn
    return tb.localeCompare(ta)
  })

  const activos = ordenados.filter(c => !c.archivado)
  const todasMaterias = activos.flatMap(c => c.materias)

  // próximas a vencer dentro de 5 días (incluyendo hoy)
  const proximas = todasMaterias.filter(m => {
    if (m.estado !== 'pendiente') return false
    const dias = Math.round((new Date(m.fechaCierre + 'T00:00:00').getTime() - HOY.getTime()) / (1000 * 60 * 60 * 24))
    return dias >= 0 && dias <= 5
  }).length

  // cargadas hace 3+ días — recordar revisar si ya calificaron
  const porRevisar = todasMaterias.filter(m => {
    if (m.estado !== 'cargado') return false
    if (!m.cargadoEn) return true  // si no hay timestamp (datos viejos), igual recordar
    const dias = Math.round((Date.now() - new Date(m.cargadoEn).getTime()) / (1000 * 60 * 60 * 24))
    return dias >= 3
  }).length

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
    await avanzarEstadoMateria(clienteId, materiaId, cliente.materias)
  }

  const handleEliminar = async (id: string) => {
    if (!window.confirm('¿Eliminar este estudiante y todas sus materias?')) return
    await eliminarCliente(id)
  }

  const handleArchivar   = async (id: string) => { await archivarCliente(id) }
  const handleDesarchivar = async (id: string) => { await desarchivarCliente(id) }
  const handleInteraccion = (id: string) => { void marcarReciente(id) }

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
      const { actualizados, creados } = await importarCredenciales(pares)
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
      {(stats.vencidas > 0 || proximas > 0 || porRevisar > 0) && (
        <div className="avisos">
          {stats.vencidas > 0 && (
            <div className="aviso aviso--vencido">
              <span className="aviso-icon">🔴</span>
              <strong>{stats.vencidas}</strong>&nbsp;materia{stats.vencidas !== 1 ? 's' : ''} vencida{stats.vencidas !== 1 ? 's' : ''}
              <button className="aviso-link" onClick={() => setFiltro('vencidos')}>Ver</button>
            </div>
          )}
          {proximas > 0 && (
            <div className="aviso aviso--proxima">
              <span className="aviso-icon">⏰</span>
              <strong>{proximas}</strong>&nbsp;por vencer en los próximos 5 días
            </div>
          )}
          {porRevisar > 0 && (
            <div className="aviso aviso--revisar">
              <span className="aviso-icon">👀</span>
              <strong>{porRevisar}</strong>&nbsp;cargada{porRevisar !== 1 ? 's' : ''} hace 3+ días — revisar si ya calificaron
              <button className="aviso-link" onClick={() => setFiltro('cargados')}>Ver</button>
            </div>
          )}
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
            onEditar={onEditar}
            onEliminar={handleEliminar}
            onArchivar={handleArchivar}
            onDesarchivar={handleDesarchivar}
            onInteraccion={handleInteraccion}
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
