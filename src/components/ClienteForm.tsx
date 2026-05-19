import { useState, useEffect } from 'react'
import type { Cliente, Materia, EstadoTrabajo } from '../types'
import { agregarCliente, actualizarCliente, getMateriasSugeridas } from '../utils/storage'

interface Props {
  clienteEditar?: Cliente | null
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
}

interface FormData {
  nombre: string
  usuario: string
  contrasena: string
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
  }))
}

const VACIO: FormData = { nombre: '', usuario: '', contrasena: '', materias: [] }

export default function ClienteForm({ clienteEditar, onGuardado, onCancelar }: Props) {
  const editando = !!clienteEditar
  const [form, setForm] = useState<FormData>(() =>
    editando
      ? {
          nombre: clienteEditar!.nombre,
          usuario: clienteEditar!.usuario,
          contrasena: clienteEditar!.contrasena,
          materias: materiasIniciales(clienteEditar!.materias),
        }
      : VACIO
  )
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [verClave, setVerClave] = useState(false)
  const [sugerencias, setSugerencias] = useState<string[]>([])

  useEffect(() => {
    if (editando) {
      getMateriasSugeridas().then(setSugerencias).catch(() => setSugerencias([]))
    }
  }, [editando])

  const setField = (campo: 'nombre' | 'usuario' | 'contrasena', valor: string) => {
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

  const quitarMat = (idx: number) =>
    setForm(prev => ({ ...prev, materias: prev.materias.filter((_, i) => i !== idx) }))

  const validar = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.usuario.trim()) e.usuario = 'Requerido'
    if (!form.contrasena.trim()) e.contrasena = 'Requerido'
    if (editando) {
      form.materias.forEach((m, i) => {
        if (!m.nombre.trim()) e[`mat_${i}_nombre`] = 'Requerido'
        if (!m.fechaCierre)   e[`mat_${i}_fechaCierre`] = 'Requerido'
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
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar()) return
    const data = {
      nombre: form.nombre,
      usuario: form.usuario,
      contrasena: form.contrasena,
      tutor: '',
      materias: editando ? construirMaterias() : [],
    }
    if (editando) {
      await actualizarCliente(clienteEditar!.id, data)
    } else {
      await agregarCliente(data)
    }
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

          {editando && (
            <div className="form-section">
              <div className="materias-header">
                <h3 className="form-section-title">Materias</h3>
                <button type="button" className="btn-agregar-otra" onClick={agregarMat}>＋ Agregar materia</button>
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
                  <button type="button" className="btn-quitar" onClick={() => quitarMat(i)} title="Quitar materia">✕</button>
                </div>
              ))}
            </div>
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
