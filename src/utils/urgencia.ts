import type { Cliente, Materia } from '../types'

export type NivelUrgencia = 'vencida' | 'urgente' | 'revisar' | 'normal' | 'completo' | 'vacio'

export interface InfoUrgencia {
  nivel: NivelUrgencia
  score: number
  texto: string
  icono: string
}

const MS_DIA = 1000 * 60 * 60 * 24

function hoyMs(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function diasHasta(fecha: string): number {
  return Math.round((new Date(fecha + 'T00:00:00').getTime() - hoyMs()) / MS_DIA)
}

export function diasDesde(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / MS_DIA)
}

export function urgenciaCliente(c: Cliente): InfoUrgencia {
  const pendientes = c.materias.filter(m => m.estado === 'pendiente')
  const vencidas = pendientes.filter(m => diasHasta(m.fechaCierre) < 0)

  if (vencidas.length > 0) {
    const peor = vencidas.reduce((a, b) => diasHasta(a.fechaCierre) < diasHasta(b.fechaCierre) ? a : b)
    const dias = Math.abs(diasHasta(peor.fechaCierre))
    return {
      nivel: 'vencida',
      score: 1000 + dias,
      icono: '🔴',
      texto: vencidas.length > 1
        ? `${vencidas.length} vencidas — la peor hace ${dias} día${dias !== 1 ? 's' : ''}`
        : `Venció hace ${dias} día${dias !== 1 ? 's' : ''}`,
    }
  }

  if (pendientes.length > 0) {
    const proxima = pendientes.reduce((a, b) => diasHasta(a.fechaCierre) < diasHasta(b.fechaCierre) ? a : b)
    const dias = diasHasta(proxima.fechaCierre)
    if (dias <= 5) {
      return {
        nivel: 'urgente',
        score: 500 + (5 - dias),
        icono: '⚠',
        texto: dias === 0 ? 'Vence hoy' : `Vence en ${dias} día${dias !== 1 ? 's' : ''}`,
      }
    }
  }

  const cargadasViejas = c.materias.filter(m => {
    if (m.estado !== 'cargado') return false
    if (!m.cargadoEn) return true
    return diasDesde(m.cargadoEn) >= 3
  })
  if (cargadasViejas.length > 0) {
    return {
      nivel: 'revisar',
      score: 100,
      icono: '👀',
      texto: `${cargadasViejas.length} para revisar`,
    }
  }

  if (pendientes.length > 0) {
    const proxima = pendientes.reduce((a, b) => diasHasta(a.fechaCierre) < diasHasta(b.fechaCierre) ? a : b)
    const dias = diasHasta(proxima.fechaCierre)
    return {
      nivel: 'normal',
      score: 50 - dias,
      icono: '○',
      texto: `Próx. cierre en ${dias} día${dias !== 1 ? 's' : ''}`,
    }
  }

  const cargadasRecientes = c.materias.filter(m => m.estado === 'cargado')
  if (cargadasRecientes.length > 0) {
    return {
      nivel: 'normal',
      score: 30,
      icono: '⬆',
      texto: 'Esperando calificación',
    }
  }

  if (c.materias.length > 0 && c.materias.every(m => m.estado === 'calificado')) {
    return {
      nivel: 'completo',
      score: 5,
      icono: '✓',
      texto: 'Todo calificado',
    }
  }

  return {
    nivel: 'vacio',
    score: 0,
    icono: '·',
    texto: 'Sin materias',
  }
}

export function unicaMateriaAccionable(c: Cliente): Materia | null {
  const accionables = c.materias.filter(m => m.estado === 'pendiente' || m.estado === 'cargado')
  return accionables.length === 1 ? accionables[0] : null
}

export interface ItemAtencion {
  cliente: Cliente
  materia: Materia
  detalle: string
  dias: number
}

export interface AtencionResumen {
  vencidas: ItemAtencion[]
  proximas: ItemAtencion[]
  revisar:  ItemAtencion[]
}

export function getAtencion(clientes: Cliente[]): AtencionResumen {
  const vencidas: ItemAtencion[] = []
  const proximas: ItemAtencion[] = []
  const revisar:  ItemAtencion[] = []

  for (const c of clientes) {
    if (c.archivado) continue
    for (const m of c.materias) {
      if (m.estado === 'pendiente') {
        const dias = diasHasta(m.fechaCierre)
        if (dias < 0) {
          const dd = Math.abs(dias)
          vencidas.push({ cliente: c, materia: m, detalle: `Venció hace ${dd} día${dd !== 1 ? 's' : ''}`, dias: dd })
        } else if (dias <= 5) {
          proximas.push({ cliente: c, materia: m, detalle: dias === 0 ? 'Vence hoy' : `Vence en ${dias} día${dias !== 1 ? 's' : ''}`, dias })
        }
      } else if (m.estado === 'cargado') {
        const d = m.cargadoEn ? diasDesde(m.cargadoEn) : 99
        if (d >= 3) {
          revisar.push({ cliente: c, materia: m, detalle: m.cargadoEn ? `Cargado hace ${d} día${d !== 1 ? 's' : ''}` : 'Cargado (revisar)', dias: d })
        }
      }
    }
  }

  vencidas.sort((a, b) => b.dias - a.dias)
  proximas.sort((a, b) => a.dias - b.dias)
  revisar.sort((a, b) => b.dias - a.dias)

  return { vencidas, proximas, revisar }
}

export function formatVistoHace(actualizadoEn?: string, creadoEn?: string): string | null {
  const ts = actualizadoEn ?? creadoEn
  if (!ts) return null
  const dias = diasDesde(ts)
  if (dias === 0) return 'Visto hoy'
  if (dias === 1) return 'Visto ayer'
  if (dias < 30) return `Visto hace ${dias} días`
  return null
}
