import { useState, useEffect } from 'react'
import type { Cliente } from '../types'
import { getClientes, eliminarCliente, avanzarEstadoMateria, archivarCliente, desarchivarCliente } from '../utils/storage'
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
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('activos')

  const reload = () => setClientes(getClientes())
  useEffect(() => { reload() }, [])

  const activos = clientes.filter(c => !c.archivado)
  const todasMaterias = activos.flatMap(c => c.materias)

  const stats = {
    estudiantes: activos.length,
    pendientes:  todasMaterias.filter(m => m.estado === 'pendiente' && new Date(m.fechaCierre + 'T00:00:00') >= HOY).length,
    cargadas:    todasMaterias.filter(m => m.estado === 'cargado').length,
    calificadas: todasMaterias.filter(m => m.estado === 'calificado').length,
    vencidas:    todasMaterias.filter(m => m.estado === 'pendiente' && new Date(m.fechaCierre + 'T00:00:00') < HOY).length,
    archivados:  clientes.filter(c => c.archivado).length,
  }

  const filtrados = clientes.filter(c => {
    const txt = busqueda.toLowerCase()
    const coincide =
      c.nombre.toLowerCase().includes(txt) ||
      c.usuario.toLowerCase().includes(txt) ||
      c.tutor.toLowerCase().includes(txt)
    if (!coincide) return false

    if (filtro === 'archivados') return c.archivado
    if (c.archivado) return false  // los archivados solo se ven en su filtro

    if (filtro === 'vencidos')    return c.materias.some(m => m.estado === 'pendiente' && new Date(m.fechaCierre + 'T00:00:00') < HOY)
    if (filtro === 'cargados')    return c.materias.some(m => m.estado === 'cargado')
    if (filtro === 'calificados') return c.materias.length > 0 && c.materias.every(m => m.estado === 'calificado')
    return true // 'activos'
  })

  const handleAvanzar = (clienteId: string, materiaId: string) => {
    avanzarEstadoMateria(clienteId, materiaId)
    reload()
  }
  const handleEliminar = (id: string) => {
    if (!window.confirm('¿Eliminar este estudiante y todas sus materias?')) return
    eliminarCliente(id)
    reload()
  }
  const handleArchivar = (id: string) => {
    archivarCliente(id)
    reload()
  }
  const handleDesarchivar = (id: string) => {
    desarchivarCliente(id)
    reload()
  }

  return (
    <div className="dashboard">
      {/* Stat cards */}
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

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn-nuevo" onClick={onAgregar}>＋ Nuevo estudiante</button>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="search"
              placeholder="Buscar por nombre, usuario o tutor..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
        </div>
        <div className="filtros">
          {([
            ['activos',      'Activos'],
            ['vencidos',     '⚠ Vencidos'],
            ['cargados',     '⬆ Cargados'],
            ['calificados',  '✓ Calificados'],
            ['archivados',   `📁 Archivados${stats.archivados > 0 ? ` (${stats.archivados})` : ''}`],
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

      {/* Tabla o vacío */}
      <div className="tabla-container">
        {filtrados.length === 0 ? (
          <div className="empty-state">
            {clientes.filter(c => !c.archivado).length === 0
              ? <><div className="empty-icon">📋</div><p className="empty-title">Sin estudiantes</p><p className="empty-sub">Haz clic en <strong>＋ Nuevo estudiante</strong> para comenzar.</p></>
              : filtro === 'archivados'
              ? <><div className="empty-icon">📁</div><p className="empty-title">Sin archivados</p><p className="empty-sub">Los estudiantes con todas las materias calificadas aparecerán aquí al archivarlos.</p></>
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
          />
        )}
      </div>

      {filtrados.length > 0 && (
        <div className="status-bar">
          {filtrados.length} de {activos.length} estudiante{activos.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
