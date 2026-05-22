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
          <span className="app-logo">📋</span>
          <div>
            <h1 className="app-title">Gestión de Trabajos</h1>
            <p className="app-subtitle">
              {tablaActiva ? `Tabla: ${tablaActiva.nombre}` : 'Control académico de estudiantes'}
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
            {tema === 'light' ? '🌙' : '☀'}
          </button>
          {tablaActiva && vista === 'dashboard' && (
            <button className="xl-btn xl-btn--back" onClick={salirDeTabla}>
              ← Cambiar tabla
            </button>
          )}
          {tablaActiva && vista === 'formulario' && (
            <button className="xl-btn xl-btn--back" onClick={cerrarFormulario}>
              ← Volver a la tabla
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
