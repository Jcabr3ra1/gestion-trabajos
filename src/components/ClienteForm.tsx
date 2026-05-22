import { useState, useEffect } from 'react'
import type { Cliente, Materia, EstadoTrabajo, EstadoGeneral } from '../types'
import { agregarCliente, actualizarCliente, getMateriasSugeridas } from '../utils/storage'

interface Props {
  clienteEditar?: Cliente | null
  tablaId: string
  onGuardado: () => void
  onCancelar: () => void
}

interface MateriaForm {
  id: string
  nombre: string
  fechaCierre: string
  tutor: string
  estado: EstadoTrabajo
  cargadoEn?: string
  preinscritoEn?: string
}

interface FormData {
  nombre: string
  usuario: string
  contrasena: string
  estadoGeneral: EstadoGeneral
  materias: MateriaForm[]
}

function materiasIniciales(materias: Materia[]): MateriaForm[] {
  return materias.map(m => ({
    id: m.id,
    nombre: m.nombre,
    fechaCierre: m.fechaCierre,
    tutor: m.tutor ?? '',
    estado: m.estado,
    cargadoEn: m.cargadoEn,
    preinscritoEn: m.preinscritoEn,
  }))
}

const VACIO: FormData = { nombre: '', usuario: '', contrasena: '', estadoGeneral: 'activo', materias: [] }

export default function ClienteForm({ clienteEditar, tablaId, onGuardado, onCancelar }: Props) {
  const editando = !!clienteEditar
  const [form, setForm] = useState<FormData>(() =>
    editando
      ? {
          nombre: clienteEditar!.nombre,
          usuario: clienteEditar!.usuario,
          contrasena: clienteEditar!.contrasena,
          estadoGeneral: clienteEditar!.estadoGeneral ?? 'activo',
          materias: materiasIniciales(clienteEditar!.materias),
        }
      : VACIO
  )
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [verClave, setVerClave] = useState(false)
  const [sugerencias, setSugerencias] = useState<string[]>([])

  useEffect(() => {
    if (editando) {
      getMateriasSugeridas(20, tablaId).then(setSugerencias).catch(() => setSugerencias([]))
    }
  }, [editando, tablaId])

  const setField = (campo: 'nombre' | 'usuario' | 'contrasena' | 'estadoGeneral', valor: string) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
    setErrores(prev => ({ ...prev, [campo]: '' }))
  }

  const agregarMat = () =>
    setForm(prev => ({
      ...prev,
      materias: [...prev.materias, { id: crypto.randomUUID(), nombre: '', fechaCierre: '', tutor: '', estado: 'pendiente' }],
    }))

  const setMat = (idx: number, campo: 'nombre' | 'fechaCierre' | 'tutor', valor: string) => {
    setForm(prev => ({
      ...prev,
      materias: prev.materias.map((m, i) => (i === idx ? { ...m, [campo]: valor } : m)),
    }))
    setErrores(prev => ({ ...prev, [`mat_${idx}_${campo}`]: '' }))
  }

  const setMatEstado = (idx: number, estado: EstadoTrabajo) => {
    setForm(prev => ({
      ...prev,
      materias: prev.materias.map((m, i) => (i === idx ? { ...m, estado } : m)),
    }))
    if (estado === 'preinscrito') {
      setErrores(prev => ({ ...prev, [`mat_${idx}_fechaCierre`]: '' }))
    }
  }

  const quitarMat = (idx: number) =>
    setForm(prev => ({ ...prev, materias: prev.materias.filter((_, i) => i !== idx) }))

  const validar = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.usuario.trim()) e.usuario = 'Requerido'
    if (!form.contrasena.trim()) e.contrasena = 'Requerido'
    if (editando) {
      form.materias.forEach((m, i) => {
        if (!m.nombre.trim()) e[`mat_${i}_nombre`] = 'Requerido'
        if (m.estado !== 'preinscrito' && !m.fechaCierre) e[`mat_${i}_fechaCierre`] = 'Requerido'
      })
    }
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const construirMaterias = (): Materia[] =>
    form.materias.map(m => ({
      id: m.id,
      nombre: m.nombre.trim(),
      fechaCierre: m.fechaCierre,
      estado: m.estado,
      tutor: m.tutor.trim(),
      cargadoEn: m.cargadoEn ?? '',
      preinscritoEn: m.estado === 'preinscrito' ? (m.preinscritoEn || new Date().toISOString()) : '',
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar()) return
    const data = {
      nombre: form.nombre,
      usuario: form.usuario,
      contrasena: form.contrasena,
      seccion: '',
      estadoGeneral: form.estadoGeneral,
      tutor: '',
      materias: editando ? construirMaterias() : [],
    }
    if (editando) {
      await actualizarCliente(clienteEditar!.id, data, tablaId)
    } else {
      await agregarCliente(data, tablaId)
    }
    onGuardado()
  }

  return (
    <div className="form-page">
      <div className="form-card">
        <div className="form-card-header">
          {editando ? (
            <span className="form-card-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, color: 'var(--brand-primary)' }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </span>
          ) : (
            <span className="form-card-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, color: 'var(--brand-primary)' }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
          )}
          <div>
            <h2 className="form-card-title">{editando ? 'Editar estudiante' : 'Nuevo estudiante'}</h2>
            <p className="form-card-sub">{editando ? 'Modifica los datos del estudiante' : 'Registra los datos de acceso a la plataforma'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          <div className="form-section">
            <h3 className="form-section-title">Datos de acceso</h3>
            <div className="form-grid">
              <div className="field">
                <label>Nombre del estudiante <span className="field-opt">opcional</span></label>
                <input type="text" value={form.nombre} onChange={e => setField('nombre', e.target.value)} placeholder="Ej: María García" />
              </div>
              <div className="field">
                <label>Usuario de la plataforma <span className="field-req">*</span></label>
                <input type="text" value={form.usuario} onChange={e => setField('usuario', e.target.value)}
                  className={errores.usuario ? 'field-input--err' : ''} placeholder="Ej: mgarcia2024" />
                {errores.usuario && <span className="field-err">{errores.usuario}</span>}
              </div>
              <div className="field field--full">
                <label>Contraseña de la plataforma <span className="field-req">*</span></label>
                <div className="field-pass">
                  <input type={verClave ? 'text' : 'password'} value={form.contrasena}
                    onChange={e => setField('contrasena', e.target.value)}
                    className={errores.contrasena ? 'field-input--err' : ''}
                    placeholder="Contraseña del estudiante" />
                  <button type="button" className="pass-toggle" onClick={() => setVerClave(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {verClave ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                        Ocultar
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Ver
                      </>
                    )}
                  </button>
                </div>
                {errores.contrasena && <span className="field-err">{errores.contrasena}</span>}
              </div>
            </div>
          </div>

          {editando && (
            <div className="form-section">
              <div className="materias-header">
                <h3 className="form-section-title">Materias</h3>
                <button type="button" className="btn-agregar-otra" onClick={agregarMat} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Agregar materia
                </button>
              </div>
              <p className="form-section-hint">
                Escribí el nombre de la materia. {sugerencias.length > 0 && 'Las más usadas aparecen como sugerencia al escribir.'}
              </p>

              <datalist id="materias-sugeridas">
                {sugerencias.map(s => <option key={s} value={s} />)}
              </datalist>

              {form.materias.length === 0 && (
                <p className="otras-empty">Sin materias. Usá el botón <strong>＋ Agregar materia</strong> arriba.</p>
              )}

              {form.materias.map((m, i) => (
                <div key={m.id} className="materia-card">
                  <div className="field">
                    <label>Estado</label>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={m.estado === 'preinscrito'}
                      className={`check-preinscrito${m.estado === 'preinscrito' ? ' check-preinscrito--on' : ''}`}
                      onClick={() => setMatEstado(i, m.estado === 'preinscrito' ? 'pendiente' : 'preinscrito')}
                      title="Marcar esta materia como preinscrita"
                    >
                      <span className="check-preinscrito-box">
                        {m.estado === 'preinscrito' && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      Preinscrito
                    </button>
                  </div>
                  <div className="field">
                    <label>Materia</label>
                    <input
                      type="text"
                      value={m.nombre}
                      onChange={e => setMat(i, 'nombre', e.target.value)}
                      className={errores[`mat_${i}_nombre`] ? 'field-input--err' : ''}
                      list="materias-sugeridas"
                      placeholder="Ej: Lectura Crítica"
                    />
                    {errores[`mat_${i}_nombre`] && <span className="field-err">{errores[`mat_${i}_nombre`]}</span>}
                  </div>
                  <div className="field">
                    <label>Fecha de cierre</label>
                    <input type="date" value={m.fechaCierre} onChange={e => setMat(i, 'fechaCierre', e.target.value)}
                      className={errores[`mat_${i}_fechaCierre`] ? 'field-input--err' : ''} />
                    {errores[`mat_${i}_fechaCierre`] && <span className="field-err">{errores[`mat_${i}_fechaCierre`]}</span>}
                  </div>
                  <div className="field">
                    <label>Tutor <span className="field-opt">opcional</span></label>
                    <input type="text" value={m.tutor} onChange={e => setMat(i, 'tutor', e.target.value)}
                      placeholder="Ej: Prof. Ramírez" />
                  </div>
                  <button type="button" className="btn-quitar" onClick={() => quitarMat(i)} title="Quitar materia" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="form-footer">
            <button type="button" className="btn-cancel" onClick={onCancelar}>Cancelar</button>
            <button type="submit" className="btn-save" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {editando ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Guardar cambios
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  Registrar estudiante
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
