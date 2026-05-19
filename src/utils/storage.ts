import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, getDocs,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Cliente, Materia, EstadoTrabajo } from '../types'

const COL = 'clientes'

const CICLO: Record<EstadoTrabajo, EstadoTrabajo> = {
  pendiente:  'cargado',
  cargado:    'calificado',
  calificado: 'pendiente',
}

const ahora = () => new Date().toISOString()

export function suscribirClientes(callback: (clientes: Cliente[]) => void) {
  const q = query(collection(db, COL))
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
  const ts = ahora()
  await addDoc(collection(db, COL), {
    ...data,
    archivado: false,
    creadoEn: ts,
    actualizadoEn: ts,
  })
}

export async function actualizarCliente(id: string, cambios: Partial<Omit<Cliente, 'id' | 'creadoEn'>>): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...cambios, actualizadoEn: ahora() })
}

export async function eliminarCliente(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

export async function avanzarEstadoMateria(clienteId: string, materiaId: string, materias: Materia[]): Promise<void> {
  const actualizadas = materias.map(m =>
    m.id === materiaId ? { ...m, estado: CICLO[m.estado] } : m
  )
  await updateDoc(doc(db, COL, clienteId), { materias: actualizadas, actualizadoEn: ahora() })
}

export async function marcarReciente(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), { actualizadoEn: ahora() })
}

export async function archivarCliente(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), { archivado: true, actualizadoEn: ahora() })
}

export async function desarchivarCliente(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), { archivado: false, actualizadoEn: ahora() })
}

export function nuevaMateria(nombre: string, fechaCierre: string, tutor: string = ''): Materia {
  return { id: crypto.randomUUID(), nombre, fechaCierre, estado: 'pendiente', tutor }
}

export interface ResultadoImport {
  actualizados: number
  creados: number
}

export async function importarCredenciales(
  pares: { usuario: string; contrasena: string }[]
): Promise<ResultadoImport> {
  const snap = await getDocs(collection(db, COL))
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Cliente))

  let actualizados = 0
  let creados = 0

  for (const { usuario, contrasena } of pares) {
    const encontrado = docs.find(c =>
      String(c.usuario).trim().toLowerCase() === String(usuario).trim().toLowerCase()
    )
    const ts = ahora()
    if (encontrado) {
      await updateDoc(doc(db, COL, encontrado.id), { contrasena, actualizadoEn: ts })
      actualizados++
    } else {
      await addDoc(collection(db, COL), {
        nombre: usuario,
        usuario,
        contrasena,
        tutor: '',
        materias: [],
        archivado: false,
        creadoEn: ts,
        actualizadoEn: ts,
      })
      creados++
    }
  }

  return { actualizados, creados }
}
