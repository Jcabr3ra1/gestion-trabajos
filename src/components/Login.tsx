import { useState } from 'react'

const USUARIO = 'familiaj'
const CLAVE   = '7023'

interface Props {
  onLogin: () => void
}

export default function Login({ onLogin }: Props) {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave]     = useState('')
  const [error, setError]     = useState(false)
  const [verClave, setVerClave] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (usuario.trim() === USUARIO && clave === CLAVE) {
      localStorage.setItem('gt_auth', '1')
      onLogin()
    } else {
      setError(true)
      setClave('')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo">📋</span>
          <h1 className="login-title">Gestión de Trabajos</h1>
          <p className="login-sub">Control académico de estudiantes</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label>Usuario</label>
            <input
              type="text"
              value={usuario}
              onChange={e => { setUsuario(e.target.value); setError(false) }}
              placeholder="Ingresa tu usuario"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="login-field">
            <label>Contraseña</label>
            <div className="field-pass">
              <input
                type={verClave ? 'text' : 'password'}
                value={clave}
                onChange={e => { setClave(e.target.value); setError(false) }}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
              />
              <button type="button" className="pass-toggle" onClick={() => setVerClave(v => !v)}>
                {verClave ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <p className="login-error">Usuario o contraseña incorrectos</p>
          )}

          <button type="submit" className="login-btn">Entrar →</button>
        </form>
      </div>
    </div>
  )
}
