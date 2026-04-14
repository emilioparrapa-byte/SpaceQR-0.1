# Campana de Flujo Laminar — Sistema de Reservaciones

> Sistema web para reservar turnos en la Campana de Flujo Laminar del Cuarto de Cultivo, Edificio J · **Universidad de Sonora**

---

## Tabla de Contenidos

- [Descripción](#descripción)
- [Características](#características)
- [Tecnologías](#tecnologías)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [API Reference](#api-reference)
- [Arquitectura](#arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Seguridad](#seguridad)
- [PWA / Modo Offline](#pwa--modo-offline)
- [Logs y Respaldos](#logs-y-respaldos)
- [Contribuir](#contribuir)

---

## Descripción

Aplicación web mobile-first que permite a estudiantes e investigadores de la Universidad de Sonora reservar horarios de uso en la Campana de Flujo Laminar. Las reservas se actualizan en **tiempo real** para todos los usuarios conectados mediante WebSockets.

Cada usuario puede reservar hasta **4 slots de 30 minutos** por día (equivalente a 2 horas máximo).

---

## Características

### Usuario
- Reservar slots de 30 min entre 07:00 y 22:00
- Ver disponibilidad en tiempo real (WebSocket)
- Cancelar reservaciones propias
- Navegar los próximos 7 días
- Historial de próxima disponibilidad cuando un día está lleno
- Confirmación por email (opcional, requiere SMTP)
- Instalable como app (PWA) y funciona offline

### Administrador
- Acceso protegido por contraseña
- Ver, mover y cancelar cualquier reservación
- Buscar reservaciones por nombre de usuario
- Eliminar todas las reservaciones de un día
- Estadísticas semanales: top usuarios, slots más populares, ocupación por día
- Exportar reservaciones en CSV (compatible con Excel)
- Descargar respaldo de la base de datos (`.db`)

### Sistema
- Rate limiting en todos los endpoints (protección contra abuso)
- Logging estructurado en JSON por día
- Auto-backup diario del archivo SQLite
- Validación de fechas en servidor (sin reservas en el pasado)

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js (ESM) |
| Lenguaje | TypeScript |
| Servidor web | Express 4 |
| Base de datos | SQLite 3 |
| Tiempo real | Socket.io 4 |
| Sesiones | express-session |
| Rate limiting | express-rate-limit |
| Email | Nodemailer |
| Frontend | HTML / CSS / Vanilla JS |
| PWA | Service Worker + Web App Manifest |

---

## Instalación

### Requisitos

- Node.js 18 o superior
- npm 9 o superior

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/campana-flujo-laminar.git
cd campana-flujo-laminar

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus valores (ver sección Configuración)

# 4. Iniciar el servidor
npm run dev  # Para desarrollo (con TypeScript directamente)
# o
npm start    # Para producción (compila TypeScript primero)
```

Abre tu navegador en `http://localhost:3000`

---

## Configuración

Crea un archivo `.env` en la raíz del proyecto. Puedes usar `.env.example` como plantilla:

```bash
cp .env.example .env
```

### Variables disponibles

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno (`development` / `production`) | `development` |
| `ADMIN_PW` | Contraseña del panel de administrador | `flujo2024` |
| `SESSION_SECRET` | Secreto para firmar sesiones (¡cámbialo!) | `your-secret-key` |
| `EMAIL_HOST` | Host SMTP para confirmaciones | _(vacío = desactivado)_ |
| `EMAIL_PORT` | Puerto SMTP | `587` |
| `EMAIL_SECURE` | TLS en SMTP (`true` / `false`) | `false` |
| `EMAIL_USER` | Usuario SMTP | _(vacío)_ |
| `EMAIL_PASS` | Contraseña SMTP | _(vacío)_ |
| `EMAIL_FROM` | Remitente del correo | `no-reply@campana-unison.local` |

> **Importante:** En producción cambia siempre `ADMIN_PW` y `SESSION_SECRET` por valores seguros. Nunca subas tu `.env` al repositorio.

---

## Uso

### Hacer una reservación

1. Elige el día en la barra de fechas (hoy + 6 días).
2. Toca un slot **disponible** (verde).
3. Ingresa tu nombre y, opcionalmente, tu email.
4. Confirma — los demás usuarios verán el cambio al instante.

### Cancelar una reservación

- Toca tu reservación (en dorado) e ingresa tu nombre para cancelarla.
- El administrador puede cancelar cualquier reservación sin contraseña adicional.

### Panel de Administrador

1. Pulsa el botón **Admin** en el encabezado.
2. Ingresa la contraseña de administrador.
3. Desde el panel puedes:
   - Mover reservaciones a otro horario
   - Buscar todas las reservas de un usuario
   - Ver estadísticas de la semana
   - Exportar CSV o descargar el respaldo de la DB

---

## API Reference

Todos los endpoints están bajo `/api/`. El rate limit general es **120 solicitudes cada 15 minutos** por IP.

### Reservaciones

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/bookings/:date` | Obtener reservaciones de una fecha | — |
| `POST` | `/api/bookings` | Crear reservación | — |
| `DELETE` | `/api/bookings/:date/:slot` | Cancelar reservación | Propietario o Admin |
| `POST` | `/api/bookings/move` | Mover reservación a otro slot | Admin |

#### POST `/api/bookings`
```json
{
  "date": "2025-07-15",
  "slot": "09:00",
  "userName": "Ana López",
  "email": "ana@estudiante.uson.mx"
}
```

#### DELETE `/api/bookings/:date/:slot`
```json
{
  "userName": "Ana López"
}
```

#### POST `/api/bookings/move`
```json
{
  "date": "2025-07-15",
  "fromSlot": "09:00",
  "toSlot": "11:30"
}
```

---

### Estadísticas

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/stats/:date` | Estadísticas de ocupación de un día | — |
| `GET` | `/api/admin/stats` | Estadísticas globales de la semana | Admin |

#### Respuesta de `/api/stats/:date`
```json
{
  "date": "2025-07-15",
  "total": 30,
  "booked": 12,
  "free": 18,
  "occupancyPct": 40,
  "peakHour": "10:00",
  "nextFree": "07:30",
  "byHour": {
    "07:00": { "booked": 2, "total": 2 },
    "08:00": { "booked": 1, "total": 2 }
  }
}
```

---

### Administrador

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/admin/login` | Iniciar sesión admin _(rate limited: 10/15 min)_ |
| `POST` | `/api/admin/logout` | Cerrar sesión admin |
| `GET` | `/api/admin/status` | Verificar si la sesión es admin |
| `DELETE` | `/api/admin/bookings/:date` | Eliminar todas las reservaciones de un día |
| `GET` | `/api/admin/user/:name` | Buscar reservaciones por nombre de usuario |
| `GET` | `/api/admin/export?from=&to=` | Descargar CSV de reservaciones |
| `GET` | `/api/admin/backup` | Descargar respaldo del archivo `.db` |

---

### Eventos Socket.io

| Evento | Dirección | Payload |
|--------|-----------|---------|
| `bookingUpdate` | Servidor → Clientes | `{ date, bookings: { [slot]: { userName, bookedAt } } }` |

---

## Arquitectura

```
Cliente (Browser / PWA)
       │
       │  HTTP / WebSocket
       ▼
┌─────────────────────────┐
│       Express Server     │
│  ┌──────────────────┐   │
│  │   API Routes     │   │
│  │  Rate Limiter    │   │
│  │  Session Auth    │   │
│  └────────┬─────────┘   │
│           │              │
│  ┌────────▼─────────┐   │
│  │    SQLite DB     │   │
│  └──────────────────┘   │
│                          │
│  ┌──────────────────┐   │
│  │    Socket.io     │◄──┼── Emite bookingUpdate
│  └──────────────────┘   │   a todos los clientes
└─────────────────────────┘
       │
       ├── logs/YYYY-MM-DD.log
       └── backups/bookings_YYYY-MM-DD.db
```

---

## Estructura del Proyecto

```
campana-flujo-laminar/
├── server.js            # Servidor Express + Socket.io + API
├── index.html           # App frontend (single page)
├── package.json
├── .env                 # Variables de entorno (no versionar)
├── .env.example         # Plantilla de configuración
├── manifest.json        # Manifiesto PWA
├── sw.js                # Service Worker (offline support)
├── bookings.db          # Base de datos SQLite
│
├── public/
│   └── app.js           # Lógica del frontend
│
├── logs/                # Generado automáticamente
│   └── 2025-07-15.log
│
└── backups/             # Generado automáticamente
    └── bookings_2025-07-15.db
```

---

## Seguridad

- **Contraseña admin no expuesta** en el cliente — la validación ocurre únicamente en el servidor
- **Sesiones de servidor** (express-session) para autenticación de admin
- **Rate limiting** en tres niveles:
  - General: 120 req / 15 min por IP
  - Reservaciones: 15 req / hora por IP
  - Login admin: 10 intentos / 15 min (bloqueo temporal)
- **Validación de fechas** en servidor: no se permiten reservas en fechas pasadas o fuera del rango de 7 días
- **Validación de propietario** en cancelaciones: solo el titular o un admin puede cancelar
- En producción, configura `NODE_ENV=production` para activar cookies seguras (HTTPS only)

---

## PWA / Modo Offline

La aplicación puede instalarse como app nativa en dispositivos móviles y de escritorio.

### Instalar desde el navegador

- **Android / Chrome:** menú ⋮ → *Agregar a pantalla de inicio*
- **iOS / Safari:** botón de compartir → *Agregar a pantalla de inicio*
- **Desktop / Chrome:** ícono de instalación en la barra de direcciones

### Comportamiento offline

- Las páginas ya visitadas se sirven desde caché
- Los endpoints de API muestran un mensaje claro cuando no hay red
- Socket.io reconecta automáticamente al recuperar conexión

---

## Logs y Respaldos

### Logs

Se generan en `logs/YYYY-MM-DD.log`, uno por día, en formato JSON línea a línea:

```json
{"ts":"2025-07-15T09:12:33.000Z","action":"booking_created","date":"2025-07-15","slot":"09:00","userName":"Ana López"}
{"ts":"2025-07-15T09:45:00.000Z","action":"admin_login","ip":"::1"}
```

Acciones registradas: `server_started`, `db_connected`, `request`, `booking_created`, `booking_cancelled`, `booking_moved`, `admin_login`, `admin_login_failed`, `admin_delete_all`, `csv_export`, `db_backup_downloaded`, `auto_backup`, `socket_connected`, `socket_disconnected`, `email_error`.

### Respaldos automáticos

Cada 24 horas el servidor copia `bookings.db` a `backups/bookings_YYYY-MM-DD.db`. Los respaldos no se eliminan automáticamente; puedes purgar los más antiguos manualmente o con un cron job:

```bash
# Eliminar respaldos con más de 30 días
find backups/ -name "*.db" -mtime +30 -delete
```

También puedes descargar el respaldo manualmente desde el panel de administrador.

---

## Contribuir

1. Haz un fork del repositorio
2. Crea tu rama: `git checkout -b feature/mi-mejora`
3. Commitea tus cambios: `git commit -m "feat: descripción"`
4. Haz push: `git push origin feature/mi-mejora`
5. Abre un Pull Request

---

*Desarrollado para el laboratorio de Biología · Universidad de Sonora*
