import { useState } from 'react'
import type { Cliente } from './types'
import Dashboard from './pages/Dashboard'
import ClienteForm from './components/ClienteForm'
import './App.css'

type Vista = 'dashboard' | 'formulario'

export default function App() {
  const [vista, setVista] = useState<Vista>('dashboard')
  const [clienteEditar, setClienteEditar] = useState<Cliente | null>(null)

  const abrirFormulario = (cliente?: Cliente) => {
    setClienteEditar(cliente ?? null)
    setVista('formulario')
  }

  const cerrarFormulario = () => {
    setClienteEditar(null)
    setVista('dashboard')
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-logo">📋</span>
          <div>
            <h1 className="app-title">Gestión de Trabajos</h1>
            <p className="app-subtitle">Control académico de estudiantes</p>
          </div>
        </div>
        {vista === 'formulario' && (
          <button className="xl-btn xl-btn--back" onClick={cerrarFormulario}>
            ← Volver a la tabla
          </button>
        )}
      </header>

      <main className="app-main">
        {vista === 'dashboard' && (
          <Dashboard
            onAgregar={() => abrirFormulario()}
            onEditar={(c) => abrirFormulario(c)}
          />
        )}
        {vista === 'formulario' && (
          <ClienteForm
            clienteEditar={clienteEditar}
            onGuardado={cerrarFormulario}
            onCancelar={cerrarFormulario}
          />
        )}
      </main>
    </div>
  )
}
