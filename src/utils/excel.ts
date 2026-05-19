import * as XLSX from 'xlsx'
import type { Cliente } from '../types'

export interface FilaCredencial {
  usuario: string
  contrasena: string
}

export function exportarCredenciales(clientes: Cliente[]): void {
  const filas = clientes.map(c => ({
    Usuario: c.usuario,
    Contraseña: c.contrasena,
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

        const headers = (filas[0] as unknown[]).map(h => String(h ?? ''))

        // encontrar índices por nombre de columna, si no se encuentran usar 0 y 1
        let idxUsuario    = headers.findIndex(esColumnaUsuario)
        let idxContrasena = headers.findIndex(esColumnaContrasena)
        if (idxUsuario    === -1) idxUsuario    = 0
        if (idxContrasena === -1) idxContrasena = 1

        const credenciales: FilaCredencial[] = []
        for (let i = 1; i < filas.length; i++) {
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
