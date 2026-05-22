import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, getDocs, orderBy, writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Cliente, Materia, EstadoTrabajo, Tabla } from '../types'

const COL = 'clientes'
const COL_TABLAS = 'tablas'

const CICLO: Record<EstadoTrabajo, EstadoTrabajo> = {
  preinscrito: 'pendiente',
  pendiente:   'cargado',
  cargado:     'calificado',
  calificado:  'pendiente',
}

const ahora = () => new Date().toISOString()

/* ── helper: colección de clientes según tabla ── */
function clientesCol(tablaId?: string) {
  if (tablaId) return collection(db, COL_TABLAS, tablaId, COL)
  return collection(db, COL)
}

function clienteDoc(id: string, tablaId?: string) {
  if (tablaId) return doc(db, COL_TABLAS, tablaId, COL, id)
  return doc(db, COL, id)
}

/* ═══════════════════════════════════════════════
   CLIENTES
   ═══════════════════════════════════════════════ */

export function suscribirClientes(callback: (clientes: Cliente[]) => void, tablaId?: string) {
  const q = query(clientesCol(tablaId))
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

export async function agregarCliente(
  data: Omit<Cliente, 'id' | 'creadoEn' | 'archivado'>,
  tablaId?: string
): Promise<void> {
  const ts = ahora()
  await addDoc(clientesCol(tablaId), {
    ...data,
    seccion: data.seccion ?? '',
    archivado: false,
    creadoEn: ts,
    actualizadoEn: ts,
  })
}

export async function actualizarCliente(
  id: string,
  cambios: Partial<Omit<Cliente, 'id' | 'creadoEn'>>,
  tablaId?: string
): Promise<void> {
  await updateDoc(clienteDoc(id, tablaId), { ...cambios, actualizadoEn: ahora() })
}

export async function eliminarCliente(id: string, tablaId?: string): Promise<void> {
  await deleteDoc(clienteDoc(id, tablaId))
}

export async function avanzarEstadoMateria(
  clienteId: string,
  materiaId: string,
  materias: Materia[],
  tablaId?: string
): Promise<void> {
  const ts = ahora()
  const actualizadas = materias.map(m => {
    if (m.id !== materiaId) return m
    const nuevoEstado = CICLO[m.estado]
    return {
      ...m,
      estado: nuevoEstado,
      cargadoEn: nuevoEstado === 'cargado' ? ts : '',
    }
  })
  await updateDoc(clienteDoc(clienteId, tablaId), { materias: actualizadas, actualizadoEn: ts })
}

export async function marcarReciente(id: string, tablaId?: string): Promise<void> {
  await updateDoc(clienteDoc(id, tablaId), { actualizadoEn: ahora() })
}

export async function archivarCliente(id: string, tablaId?: string): Promise<void> {
  await updateDoc(clienteDoc(id, tablaId), { archivado: true, actualizadoEn: ahora() })
}

export async function desarchivarCliente(id: string, tablaId?: string): Promise<void> {
  await updateDoc(clienteDoc(id, tablaId), { archivado: false, actualizadoEn: ahora() })
}

export async function calificarTodoMaterias(
  clienteId: string,
  materias: Materia[],
  tablaId?: string
): Promise<void> {
  const ts = ahora()
  const actualizadas = materias.map(m => ({
    ...m,
    estado: 'calificado' as EstadoTrabajo,
  }))
  await updateDoc(clienteDoc(clienteId, tablaId), { materias: actualizadas, actualizadoEn: ts })
}

export async function resetearTodoMaterias(
  clienteId: string,
  materias: Materia[],
  tablaId?: string
): Promise<void> {
  const ts = ahora()
  const actualizadas = materias.map(m => ({
    ...m,
    estado: 'pendiente' as EstadoTrabajo,
    cargadoEn: '',
  }))
  await updateDoc(clienteDoc(clienteId, tablaId), { materias: actualizadas, actualizadoEn: ts })
}

export function nuevaMateria(nombre: string, fechaCierre: string, tutor: string = ''): Materia {
  return { id: crypto.randomUUID(), nombre, fechaCierre, estado: 'pendiente', tutor }
}

export async function getMateriasSugeridas(limite = 20, tablaId?: string): Promise<string[]> {
  const snap = await getDocs(clientesCol(tablaId))
  const counts = new Map<string, number>()
  for (const d of snap.docs) {
    const c = d.data() as Cliente
    for (const m of c.materias ?? []) {
      const nombre = m.nombre?.trim()
      if (!nombre) continue
      counts.set(nombre, (counts.get(nombre) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([nombre]) => nombre)
}

export interface ResultadoImport {
  actualizados: number
  creados: number
}

export async function importarCredenciales(
  pares: { usuario: string; contrasena: string }[],
  tablaId?: string
): Promise<ResultadoImport> {
  const snap = await getDocs(clientesCol(tablaId))
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Cliente))

  let actualizados = 0
  let creados = 0

  for (const { usuario, contrasena } of pares) {
    const encontrado = docs.find(c =>
      String(c.usuario).trim().toLowerCase() === String(usuario).trim().toLowerCase()
    )
    const ts = ahora()
    if (encontrado) {
      await updateDoc(clienteDoc(encontrado.id, tablaId), { contrasena, actualizadoEn: ts })
      actualizados++
    } else {
      await addDoc(clientesCol(tablaId), {
        nombre: usuario,
        usuario,
        contrasena,
        tutor: '',
        materias: [],
        seccion: '',
        archivado: false,
        creadoEn: ts,
        actualizadoEn: ts,
      })
      creados++
    }
  }

  return { actualizados, creados }
}

/* ═══════════════════════════════════════════════
   TABLAS
   ═══════════════════════════════════════════════ */

export function suscribirTablas(callback: (tablas: Tabla[]) => void) {
  const q = query(collection(db, COL_TABLAS), orderBy('creadoEn', 'desc'))
  return onSnapshot(q,
    snapshot => {
      const tablas = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tabla))
      callback(tablas)
    },
    error => {
      console.error('Firestore tablas:', error)
      callback([])
    }
  )
}

export async function agregarTabla(nombre: string): Promise<void> {
  await addDoc(collection(db, COL_TABLAS), {
    nombre,
    creadoEn: ahora(),
  })
}

export async function eliminarTabla(id: string): Promise<void> {
  // primero borrar todos los clientes de la subcolección
  const snap = await getDocs(collection(db, COL_TABLAS, id, COL))
  const batch = writeBatch(db)
  let count = 0
  for (const d of snap.docs) {
    batch.delete(d.ref)
    count++
    if (count >= 400) {
      await batch.commit()
      count = 0
    }
  }
  if (count > 0) await batch.commit()
  // luego borrar la tabla
  await deleteDoc(doc(db, COL_TABLAS, id))
}
