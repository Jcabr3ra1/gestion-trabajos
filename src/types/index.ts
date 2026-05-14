export type EstadoTrabajo = 'pendiente' | 'cargado' | 'calificado'

export interface Materia {
  id: string
  nombre: string
  fechaCierre: string
  estado: EstadoTrabajo
}

export interface Cliente {
  id: string
  nombre: string
  usuario: string
  contrasena: string
  tutor: string
  materias: Materia[]
  creadoEn: string
}
