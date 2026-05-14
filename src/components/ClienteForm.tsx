import { useState } from 'react'
import type { Cliente, Materia } from '../types'
import { agregarCliente, actualizarCliente, nuevaMateria } from '../utils/storage'

interface Props {
  clienteEditar?: Cliente | null
  onGuardado: () => void
  onCancelar: () => void
}

const MATERIAS_FIJAS = [
  'Lectura Crítica',
  'Razonamiento Cuantitativo Saber Pro',
  'Competencias Ciudadanas',
] as const

type MateriaFija = typeof MATERIAS_FIJAS[number]

interface MateriaFijaForm {
  activa: boolean
  fechaCierre: string
  id: string
}

interface OtraForm {
  id: string
  nombre: string
  fechaCierre: string
}

interface FormData {
  nombre: string
  usuario: string
  contrasena: string
  tutor: string
  fijas: Record<MateriaFija, MateriaFijaForm>
  otras: OtraForm[]
}

function iniciarFijas(materias: Materia[]): Record<MateriaFija, MateriaFijaForm> {
  const resultado = {} as Record<MateriaFija, MateriaFijaForm>
  for (const nombre of MATERIAS_FIJAS) {
    const existente = materias.find(m => m.nombre === nombre)
    resultado[nombre] = {
      activa: !!existente,
      fechaCierre: existente?.fechaCierre ?? '',
      id: existente?.id ?? crypto.randomUUID(),
    }
  }
  return resultado
}

function iniciarOtras(materias: Materia[]): OtraForm[] {
  return materias
    .filter(m => !(MATERIAS_FIJAS as readonly string[]).includes(m.nombre))
    .map(m => ({ id: m.id, nombre: m.nombre, fechaCierre: m.fechaCierre }))
}

function fijasVacias(): Record<MateriaFija, MateriaFijaForm> {
  const r = {} as Record<MateriaFija, MateriaFijaForm>
  for (const n of MATERIAS_FIJAS) r[n] = { activa: false, fechaCierre: '', id: crypto.randomUUID() }
  return r
}

const VACIO: FormData = { nombre: '', usuario: '', contrasena: '', tutor: '', fijas: fijasVacias(), otras: [] }

export default function ClienteForm({ clienteEditar, onGuardado, onCancelar }: Props) {
  const editando = !!clienteEditar
  const [form, setForm] = useState<FormData>(() =>
    editando
      ? {
          nombre: clienteEditar!.nombre,
          usuario: clienteEditar!.usuario,
          contrasena: clienteEditar!.contrasena,
          tutor: clienteEditar!.tutor,
          fijas: iniciarFijas(clienteEditar!.materias),
          otras: iniciarOtras(clienteEditar!.materias),
        }
      : VACIO
  )
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [verClave, setVerClave] = useState(false)

  const setField = (campo: keyof Omit<FormData, 'fijas' | 'otras'>, valor: string) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
    setErrores(prev => ({ ...prev, [campo]: '' }))
  }

  const setFija = (nombre: MateriaFija, campo: 'activa' | 'fechaCierre', valor: boolean | string) => {
    setForm(prev => ({
      ...prev,
      fijas: { ...prev.fijas, [nombre]: { ...prev.fijas[nombre], [campo]: valor } },
    }))
    setErrores(prev => ({ ...prev, [`fija_${nombre}`]: '' }))
  }

  const agregarOtra = () =>
    setForm(prev => ({ ...prev, otras: [...prev.otras, { id: crypto.randomUUID(), nombre: '', fechaCierre: '' }] }))

  const setOtra = (idx: number, campo: keyof OtraForm, valor: string) => {
    setForm(prev => ({
      ...prev,
      otras: prev.otras.map((o, i) => i === idx ? { ...o, [campo]: valor } : o),
    }))
    setErrores(prev => ({ ...prev, [`otra_${idx}_${campo}`]: '' }))
  }

  const quitarOtra = (idx: number) =>
    setForm(prev => ({ ...prev, otras: prev.otras.filter((_, i) => i !== idx) }))

  const validar = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.usuario.trim()) e.usuario = 'Requerido'
    if (!form.contrasena.trim()) e.contrasena = 'Requerido'
    if (editando) {
      for (const nombre of MATERIAS_FIJAS) {
        if (form.fijas[nombre].activa && !form.fijas[nombre].fechaCierre)
          e[`fija_${nombre}`] = 'Ingresa la fecha de cierre'
      }
      form.otras.forEach((o, i) => {
        if (!o.nombre.trim()) e[`otra_${i}_nombre`] = 'Requerido'
        if (!o.fechaCierre) e[`otra_${i}_fechaCierre`] = 'Requerido'
      })
    }
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const construirMaterias = (): Materia[] => {
    const fijasActivas = MATERIAS_FIJAS
      .filter(n => form.fijas[n].activa)
      .map(n => {
        const f = form.fijas[n]
        if (editando) {
          const existente = clienteEditar!.materias.find(m => m.id === f.id)
          return existente
            ? { ...existente, fechaCierre: f.fechaCierre }
            : nuevaMateria(n, f.fechaCierre)
        }
        return nuevaMateria(n, f.fechaCierre)
      })
    const otrasConvertidas = form.otras.map(o => {
      if (editando) {
        const existente = clienteEditar!.materias.find(m => m.id === o.id)
        return existente
          ? { ...existente, nombre: o.nombre, fechaCierre: o.fechaCierre }
          : nuevaMateria(o.nombre, o.fechaCierre)
      }
      return nuevaMateria(o.nombre, o.fechaCierre)
    })
    return [...fijasActivas, ...otrasConvertidas]
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar()) return
    const data = {
      nombre: form.nombre,
      usuario: form.usuario,
      contrasena: form.contrasena,
      tutor: form.tutor,
      materias: editando ? construirMaterias() : [],
    }
    editando ? actualizarCliente(clienteEditar!.id, data) : agregarCliente(data)
    onGuardado()
  }

  return (
    <div className="form-page">
      <div className="form-card">
        <div className="form-card-header">
          <span className="form-card-icon">{editando ? '✏' : '＋'}</span>
          <div>
            <h2 className="form-card-title">{editando ? 'Editar estudiante' : 'Nuevo estudiante'}</h2>
            <p className="form-card-sub">{editando ? 'Modifica los datos del estudiante' : 'Registra los datos de acceso a la plataforma'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Acceso ── */}
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
                  <button type="button" className="pass-toggle" onClick={() => setVerClave(v => !v)}>
                    {verClave ? '🙈 Ocultar' : '👁 Ver'}
                  </button>
                </div>
                {errores.contrasena && <span className="field-err">{errores.contrasena}</span>}
              </div>
            </div>
          </div>

          {/* ── Secciones solo al editar ── */}
          {editando && (
            <>
              <div className="form-section">
                <h3 className="form-section-title">Información académica</h3>
                <div className="form-grid">
                  <div className="field field--full">
                    <label>Nombre del tutor <span className="field-opt">opcional</span></label>
                    <input type="text" value={form.tutor} onChange={e => setField('tutor', e.target.value)} placeholder="Ej: Prof. Ramírez" />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="form-section-title">Materias</h3>
                <p className="form-section-hint">Activa las materias que aplican y agrega la fecha de cierre del curso.</p>

                <div className="materias-fijas">
                  {MATERIAS_FIJAS.map(nombre => {
                    const f = form.fijas[nombre]
                    return (
                      <div key={nombre} className={`materia-fija ${f.activa ? 'materia-fija--activa' : ''}`}>
                        <label className="materia-check">
                          <input
                            type="checkbox"
                            checked={f.activa}
                            onChange={e => setFija(nombre, 'activa', e.target.checked)}
                          />
                          <span className="materia-nombre">{nombre}</span>
                        </label>
                        {f.activa && (
                          <div className="materia-fecha">
                            <label>Fecha de cierre</label>
                            <input type="date" value={f.fechaCierre}
                              onChange={e => setFija(nombre, 'fechaCierre', e.target.value)}
                              className={errores[`fija_${nombre}`] ? 'field-input--err' : ''} />
                            {errores[`fija_${nombre}`] && <span className="field-err">{errores[`fija_${nombre}`]}</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="otras-header">
                  <span className="otras-label">Otros</span>
                  <button type="button" className="btn-agregar-otra" onClick={agregarOtra}>＋ Agregar otro</button>
                </div>

                {form.otras.length === 0 && (
                  <p className="otras-empty">Sin trabajos adicionales. Usa el botón de arriba si hay algo extra.</p>
                )}

                {form.otras.map((o, i) => (
                  <div key={o.id} className="otra-row">
                    <div className="field">
                      <label>Nombre del trabajo</label>
                      <input type="text" value={o.nombre} onChange={e => setOtra(i, 'nombre', e.target.value)}
                        className={errores[`otra_${i}_nombre`] ? 'field-input--err' : ''}
                        placeholder="Ej: Trabajo de grado" />
                      {errores[`otra_${i}_nombre`] && <span className="field-err">{errores[`otra_${i}_nombre`]}</span>}
                    </div>
                    <div className="field">
                      <label>Fecha de cierre</label>
                      <input type="date" value={o.fechaCierre} onChange={e => setOtra(i, 'fechaCierre', e.target.value)}
                        className={errores[`otra_${i}_fechaCierre`] ? 'field-input--err' : ''} />
                      {errores[`otra_${i}_fechaCierre`] && <span className="field-err">{errores[`otra_${i}_fechaCierre`]}</span>}
                    </div>
                    <button type="button" className="btn-quitar" onClick={() => quitarOtra(i)} title="Quitar">✕</button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="form-footer">
            <button type="button" className="btn-cancel" onClick={onCancelar}>Cancelar</button>
            <button type="submit" className="btn-save">
              {editando ? '✔ Guardar cambios' : '→ Registrar estudiante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
