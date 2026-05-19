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

export function parsearExcelCredenciales(archivo: File): Promise<FilaCredencial[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const libro = XLSX.read(data, { type: 'array' })
        const hoja  = libro.Sheets[libro.SheetNames[0]]
        const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja)

        const credenciales: FilaCredencial[] = []
        for (const fila of filas) {
          // acepta columnas con cualquier capitalización
          const usuario   = String(fila['usuario']   ?? fila['Usuario']   ?? '').trim()
          const contrasena = String(fila['contrasena'] ?? fila['Contraseña'] ?? fila['contrasenia'] ?? fila['password'] ?? '').trim()
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
