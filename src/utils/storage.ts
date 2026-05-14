import type { Cliente, Materia, EstadoTrabajo } from '../types'

const KEY = 'gestion_clientes'

const CICLO: Record<EstadoTrabajo, EstadoTrabajo> = {
  pendiente: 'cargado',
  cargado:   'calificado',
  calificado: 'pendiente',
}

export function getClientes(): Cliente[] {
  const raw = localStorage.getItem(KEY)
  if (!raw) return []
  try { return JSON.parse(raw) as Cliente[] } catch { return [] }
}

function saveClientes(clientes: Cliente[]): void {
  localStorage.setItem(KEY, JSON.stringify(clientes))
}

export function agregarCliente(data: Omit<Cliente, 'id' | 'creadoEn' | 'archivado'>): Cliente {
  const nuevo: Cliente = { ...data, archivado: false, id: crypto.randomUUID(), creadoEn: new Date().toISOString() }
  saveClientes([...getClientes(), nuevo])
  return nuevo
}

export function archivarCliente(id: string): void {
  saveClientes(getClientes().map(c => c.id === id ? { ...c, archivado: true } : c))
}

export function desarchivarCliente(id: string): void {
  saveClientes(getClientes().map(c => c.id === id ? { ...c, archivado: false } : c))
}

export function actualizarCliente(id: string, cambios: Partial<Omit<Cliente, 'id' | 'creadoEn'>>): void {
  saveClientes(getClientes().map(c => c.id === id ? { ...c, ...cambios } : c))
}

export function eliminarCliente(id: string): void {
  saveClientes(getClientes().filter(c => c.id !== id))
}

export function avanzarEstadoMateria(clienteId: string, materiaId: string): void {
  saveClientes(getClientes().map(c => {
    if (c.id !== clienteId) return c
    return {
      ...c,
      materias: c.materias.map(m =>
        m.id === materiaId ? { ...m, estado: CICLO[m.estado] } : m
      ),
    }
  }))
}

export function nuevaMateria(nombre: string, fechaCierre: string): Materia {
  return { id: crypto.randomUUID(), nombre, fechaCierre, estado: 'pendiente' }
}
