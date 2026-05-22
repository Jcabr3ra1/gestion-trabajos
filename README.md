# Gestión de Trabajos Académicos

App web personal para llevar control de trabajos académicos de estudiantes y no perder fechas de entrega. Pensada como recordatorio diario: lo más urgente sube al tope y se muestra al frente al abrir la app.

## Funcionalidades

### Tablas (espacios de trabajo)
- Se pueden crear varias tablas independientes, cada una con su propio listado de estudiantes
- Al entrar se elige una tabla; la última usada se recuerda

### Gestión de estudiantes
- Registro con nombre, usuario y contraseña de la plataforma
- Materias libres por estudiante (sin lista fija): se escribe el nombre y la app sugiere los más usados
- Tutor por materia (cada materia puede tener su propio tutor)
- Fecha de cierre por materia
- Estados de cada materia: **Preinscrito → Pendiente → Cargado → Calificado**
- Una materia se puede marcar como **Preinscrito** (casilla en el formulario); en ese estado no exige fecha de cierre
- Archivar/desarchivar estudiantes

### Panel diario "Atención hoy"
- Sección destacada arriba con las materias que requieren acción:
  - 🔴 **Vencidas** — pendientes que pasaron su fecha de cierre
  - ⚠ **Por vencer** — pendientes en los próximos 5 días
  - 👀 **Revisar si calificaron** — cargadas hace 3+ días
  - 📝 **Preinscritos por activar** — preinscritas hace 2+ días (verificar si el curso ya está activo)
- Click en cualquier item hace scroll + expande al estudiante en la tabla
- Mensaje 🎉 "Todo al día" cuando no hay nada urgente

### Tabla inteligente
- **Orden por urgencia**: lo más crítico arriba, lo reciente desempata
- **Bordes de color** por urgencia (rojo / amarillo / morado / verde)
- **"Visto hace X días"** debajo del nombre
- **Acciones ordenadas**: una acción rápida visible (⬆ Cargar / ✓ Calificar), botón Editar y un menú **⋯** con el resto (Calificar todo, Archivar, Eliminar)
- Al abrir un estudiante se cierran los demás (solo uno expandido a la vez)
- Click directo sobre el usuario o la contraseña para copiarlos al portapapeles
- Al hacer click en un estudiante, sube al tope (orden "reciente")

### Importar / exportar Excel
Agrupado en el menú **Excel** de la barra superior:
- **Exportar a Excel** — descarga todos los estudiantes con `Nombre`, `Usuario`, `Contraseña`
- **Importar desde Excel** — carga un archivo con `Usuario` y `Contraseña`:
  - Si el usuario ya existe, actualiza la contraseña
  - Si no existe, crea un estudiante nuevo
- **Descargar plantilla** — Excel vacío con el formato correcto

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
