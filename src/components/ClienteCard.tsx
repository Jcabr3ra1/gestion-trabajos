import type { Cliente } from '../types'

interface Props {
  cliente: Cliente
  onToggleEstado: (id: string) => void
  onEditar: (cliente: Cliente) => void
  onEliminar: (id: string) => void
}

export default function ClienteCard({ cliente, onToggleEstado, onEditar, onEliminar }: Props) {
  const hoy = new Date().toISOString().split('T')[0]
  const vencido = cliente.estado === 'pendiente' && cliente.fechaCierre < hoy

  const fechaFormateada = new Date(cliente.fechaCierre + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className={`card ${cliente.estado === 'hecho' ? 'card--hecho' : vencido ? 'card--vencido' : 'card--pendiente'}`}>
      <div className="card-header">
        <div>
          <h3 className="card-nombre">{cliente.nombreCliente}</h3>
          <span className="card-tutor">Tutor: {cliente.nombreTutor}</span>
        </div>
        <span className={`badge badge--${cliente.estado === 'hecho' ? 'hecho' : vencido ? 'vencido' : 'pendiente'}`}>
          {cliente.estado === 'hecho' ? 'Hecho' : vencido ? 'Vencido' : 'Pendiente'}
        </span>
      </div>

      <div className="card-body">
        <p><strong>Asignatura:</strong> {cliente.asignatura}</p>
        <p><strong>Cierre:</strong> {fechaFormateada}</p>
        {cliente.notas && <p className="card-notas"><strong>Notas:</strong> {cliente.notas}</p>}
      </div>

      <div className="card-actions">
        <button
          className={`btn btn--toggle ${cliente.estado === 'hecho' ? 'btn--secondary' : 'btn--primary'}`}
          onClick={() => onToggleEstado(cliente.id)}
        >
          {cliente.estado === 'hecho' ? 'Marcar pendiente' : 'Marcar hecho'}
        </button>
        <button className="btn btn--ghost" onClick={() => onEditar(cliente)}>Editar</button>
        <button className="btn btn--danger" onClick={() => onEliminar(cliente.id)}>Eliminar</button>
      </div>
    </div>
  )
}
