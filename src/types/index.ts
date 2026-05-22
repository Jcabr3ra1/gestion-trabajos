export type EstadoTrabajo = 'preinscrito' | 'pendiente' | 'cargado' | 'calificado'

export type EstadoGeneral = 'preinscrito' | 'activo'

export interface Seccion {
  id: string
  nombre: string
  orden: number
}

export interface Materia {
  id: string
  nombre: string
  fechaCierre: string
  estado: EstadoTrabajo
  tutor?: string
  cargadoEn?: string
}

export interface Cliente {
  id: string
  nombre: string
  usuario: string
  contrasena: string
  tutor: string
  materias: Materia[]
  seccion: string
  estadoGeneral: EstadoGeneral
  preinscritoEn?: string
  archivado: boolean
  creadoEn: string
  actualizadoEn?: string
}

export interface Tabla {
  id: string
  nombre: string
  creadoEn: string
}
