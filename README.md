# Gestión de Trabajos Académicos

App web personal para llevar control de trabajos académicos de estudiantes y no perder fechas de entrega. Pensada como recordatorio diario: lo más urgente sube al tope y se muestra al frente al abrir la app.

## Funcionalidades

### Gestión de estudiantes
- Registro con nombre, usuario y contraseña de la plataforma
- Materias libres por estudiante (sin lista fija): se escribe el nombre y la app sugiere los más usados
- Tutor por materia (cada materia puede tener su propio tutor)
- Fecha de cierre por materia
- Estados: **Pendiente → Cargado → Calificado**
- Archivar/desarchivar estudiantes

### Panel diario "Atención hoy"
- Sección destacada arriba con las materias que requieren acción:
  - 🔴 **Vencidas** — pendientes que pasaron su fecha de cierre
  - ⚠ **Por vencer** — pendientes en los próximos 5 días
  - 👀 **Para revisar** — cargadas hace 3+ días (recordatorio de verificar si ya calificaron)
- Click en cualquier item hace scroll + expande al estudiante en la tabla
- Mensaje 🎉 "Todo al día" cuando no hay nada urgente

### Tabla inteligente
- **Orden por urgencia**: lo más crítico arriba, lo reciente desempata
- **Bordes de color** por urgencia (rojo / amarillo / morado / verde)
- **"Visto hace X días"** debajo del nombre
- **Acciones rápidas**: si el estudiante tiene una sola materia accionable, botón directo ⬆ Cargar / ✓ Calificar sin expandir
- **Botones de copiar** para usuario y contraseña (📋), con toggle 👁 para mostrar/ocultar la contraseña
- Al hacer click en un estudiante, sube al tope (orden "reciente")

### Importar / exportar Excel
- **↓ Exportar Excel** — descarga todos los estudiantes con `Nombre`, `Usuario`, `Contraseña`
- **↑ Importar Excel** — carga un archivo con `Usuario` y `Contraseña`:
  - Si el usuario ya existe, actualiza la contraseña
  - Si no existe, crea un estudiante nuevo
- **▤ Plantilla** — descarga un Excel vacío con el formato correcto

### Diseño
- **Modo oscuro** con toggle 🌙/☀ en el header (se guarda la preferencia)
- **Responsive** — funciona tanto en celular como en PC
- **Toasts** elegantes en vez de los popups del navegador
- Sincronización en tiempo real con Firebase Firestore

## Tecnologías

- React 19 + TypeScript
- Vite
- Firebase Firestore
- xlsx (SheetJS) para importar/exportar Excel
- CSS propio (sin librerías de UI)

## Ejecutar en local

```bash
npm install
npm run dev
```

Para producción:

```bash
npm run build
```

## Despliegue

Desplegado en Vercel — cada push a `master` dispara un deploy automático.

## Autor

**JCabr3ra1**
