import * as XLSX from 'xlsx'
import type { Cliente } from '../types'

export interface FilaCredencial {
  usuario: string
  contrasena: string
}

export function exportarCredenciales(clientes: Cliente[]): void {
  const filas = clientes.map(c => ({
    Nombre: c.nombre,
    Usuario: c.usuario,
    Contrasena: c.contrasena,
  }))

  const hoja = XLSX.utils.json_to_sheet(filas)
  hoja['!cols'] = [{ wch: 24 }, { wch: 24 }]

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Credenciales')
  XLSX.writeFile(libro, 'credenciales.xlsx')
}

function esColumnaUsuario(header: string): boolean {
  return header.toLowerCase().includes('usuario')
}

function esColumnaContrasena(header: string): boolean {
  const h = header.toLowerCase()
  return h.includes('contrase') || h.includes('password') || h.includes('clave')
}

export function parsearExcelCredenciales(archivo: File): Promise<FilaCredencial[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data  = new Uint8Array(e.target!.result as ArrayBuffer)
        const libro = XLSX.read(data, { type: 'array' })
        const hoja  = libro.Sheets[libro.SheetNames[0]]

        // leer como arrays para evitar problemas con nombres de columna
        const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1 })
        if (filas.length < 2) { resolve([]); return }

        // buscar la fila de encabezados dentro de las primeras 5 filas
        let filaEncabezado = -1
        let idxUsuario = 0
        let idxContrasena = 1
        for (let r = 0; r < Math.min(5, filas.length); r++) {
          const row = (filas[r] as unknown[]).map(h => String(h ?? ''))
          const u = row.findIndex(esColumnaUsuario)
          const c = row.findIndex(esColumnaContrasena)
          if (u !== -1 && c !== -1) {
            filaEncabezado = r
            idxUsuario    = u
            idxContrasena = c
            break
          }
        }
        const inicio = filaEncabezado + 1  // si no se encontró encabezado, empieza en fila 0

        const credenciales: FilaCredencial[] = []
        for (let i = inicio; i < filas.length; i++) {
          const fila      = filas[i] as unknown[]
          const usuario   = String(fila[idxUsuario]    ?? '').trim()
          const contrasena = String(fila[idxContrasena] ?? '').trim()
          if (usuario && contrasena) {
            credenciales.push({ usuario, contrasena })
          }
        }
        resolve(credenciales)
      } catch {
        reject(new Error('No se pudo leer el archivo Excel'))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsArrayBuffer(archivo)
  })
}
