import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, getDocs,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Cliente, Materia, EstadoTrabajo } from '../types'

const COL = 'clientes'

const CICLO: Record<EstadoTrabajo, EstadoTrabajo> = {
  pendiente:  'cargado',
  cargado:    'calificado',
  calificado: 'pendiente',
}

export function suscribirClientes(callback: (clientes: Cliente[]) => void) {
  const q = query(collection(db, COL), orderBy('creadoEn', 'asc'))
  return onSnapshot(q,
    snapshot => {
      const clientes = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Cliente))
      callback(clientes)
    },
    error => {
      console.error('Firestore:', error.code, error.message)
      callback([])
    }
  )
}

export async function agregarCliente(data: Omit<Cliente, 'id' | 'creadoEn' | 'archivado'>): Promise<void> {
  await addDoc(collection(db, COL), {
    ...data,
    archivado: false,
    creadoEn: new Date().toISOString(),
  })
}

export async function actualizarCliente(id: string, cambios: Partial<Omit<Cliente, 'id' | 'creadoEn'>>): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...cambios })
}

export async function eliminarCliente(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

export async function avanzarEstadoMateria(clienteId: string, materiaId: string, materias: Materia[]): Promise<void> {
  const actualizadas = materias.map(m =>
    m.id === materiaId ? { ...m, estado: CICLO[m.estado] } : m
  )
  await updateDoc(doc(db, COL, clienteId), { materias: actualizadas })
}

export async function archivarCliente(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), { archivado: true })
}

export async function desarchivarCliente(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), { archivado: false })
}

export function nuevaMateria(nombre: string, fechaCierre: string): Materia {
  return { id: crypto.randomUUID(), nombre, fechaCierre, estado: 'pendiente' }
}

export interface ResultadoImport {
  actualizados: number
  noEncontrados: string[]
}

export async function actualizarContrasenasPorUsuario(
  pares: { usuario: string; contrasena: string }[]
): Promise<ResultadoImport> {
  const snap = await getDocs(collection(db, COL))
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Cliente))

  let actualizados = 0
  const noEncontrados: string[] = []

  for (const { usuario, contrasena } of pares) {
    const encontrado = docs.find(c => c.usuario === usuario)
    if (encontrado) {
      await updateDoc(doc(db, COL, encontrado.id), { contrasena })
      actualizados++
    } else {
      noEncontrados.push(usuario)
    }
  }

  return { actualizados, noEncontrados }
}
