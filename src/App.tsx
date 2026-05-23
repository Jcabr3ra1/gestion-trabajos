import { useState, useEffect } from 'react'
import type { Cliente, Tabla } from './types'
import Dashboard from './pages/Dashboard'
import ClienteForm from './components/ClienteForm'
import TablaSelector from './components/TablaSelector'
import { suscribirTablas, agregarTabla, eliminarTabla } from './utils/storage'
import './App.css'

type Vista = 'dashboard' | 'formulario'
type Tema = 'light' | 'dark'

export default function App() {
  const [vista, setVista] = useState<Vista>('dashboard')
  const [clienteEditar, setClienteEditar] = useState<Cliente | null>(null)
  const [tema, setTema] = useState<Tema>(() => {
    const saved = localStorage.getItem('gt_tema')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [tablas, setTablas] = useState<Tabla[]>([])
  const [tablaActiva, setTablaActiva] = useState<Tabla | null>(() => {
    const saved = localStorage.getItem('gt_tabla_activa')
    if (saved) {
      try { return JSON.parse(saved) as Tabla } catch { return null }
    }
    return null
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark')
    localStorage.setItem('gt_tema', tema)
  }, [tema])

  useEffect(() => {
    const unsub = suscribirTablas(data => setTablas(data))
    return unsub
  }, [])

  useEffect(() => {
    if (tablaActiva) {
      localStorage.setItem('gt_tabla_activa', JSON.stringify(tablaActiva))
    } else {
      localStorage.removeItem('gt_tabla_activa')
    }
  }, [tablaActiva])

  const abrirFormulario = (cliente?: Cliente) => {
    setClienteEditar(cliente ?? null)
    setVista('formulario')
  }

  const cerrarFormulario = () => {
    setClienteEditar(null)
    setVista('dashboard')
  }

  const handleSeleccionarTabla = (tabla: Tabla) => {
    setTablaActiva(tabla)
  }

  const handleAgregarTabla = async (nombre: string) => {
    await agregarTabla(nombre)
  }

  const handleEliminarTabla = async (id: string) => {
    await eliminarTabla(id)
    if (tablaActiva?.id === id) {
      setTablaActiva(null)
      setVista('dashboard')
    }
  }

  const salirDeTabla = () => {
    setTablaActiva(null)
    setVista('dashboard')
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo-container app-logo-pulse">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
          </div>
          <div className="app-title-group">
            <h1 className="app-title">Bitácora de Trabajos</h1>
            <p className="app-subtitle">
              {tablaActiva ? `Mesa activa: ${tablaActiva.nombre}` : 'Control diario de entregas y constancia'}
            </p>
          </div>
        </div>
        <div className="app-header-right">
          <button
            className="theme-toggle"
            onClick={() => setTema(t => t === 'light' ? 'dark' : 'light')}
            title={tema === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            aria-label="Cambiar tema"
          >
            {tema === 'light' ? (
              <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>
          {tablaActiva && vista === 'dashboard' && (
            <button className="xl-btn xl-btn--back" onClick={salirDeTabla}>
              <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Cambiar tabla
            </button>
          )}
          {tablaActiva && vista === 'formulario' && (
            <button className="xl-btn xl-btn--back" onClick={cerrarFormulario}>
              <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Volver a la tabla
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {!tablaActiva ? (
          <TablaSelector
            tablas={tablas}
            onSeleccionar={handleSeleccionarTabla}
            onAgregar={handleAgregarTabla}
            onEliminar={handleEliminarTabla}
          />
        ) : (
          <>
            {vista === 'dashboard' && (
              <Dashboard
                tablaId={tablaActiva.id}
                onAgregar={() => abrirFormulario()}
                onEditar={(c) => abrirFormulario(c)}
              />
            )}
            {vista === 'formulario' && (
              <ClienteForm
                clienteEditar={clienteEditar}
                tablaId={tablaActiva.id}
                onGuardado={cerrarFormulario}
                onCancelar={cerrarFormulario}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
