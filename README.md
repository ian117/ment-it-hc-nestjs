# NestJS Notification Service

API REST para gestión de usuarios, autenticación y envío de notificaciones multicanal (Email, SMS, Push), construida con NestJS, TypeORM y PostgreSQL.

## Tabla de contenido

- [Stack](#stack)
- [Arquitectura](#arquitectura)
- [Requisitos previos](#requisitos-previos)
- [Instalación](#instalación)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Migraciones](#migraciones)
- [Endpoints](#endpoints)
- [Payloads por canal](#payloads-por-canal)
- [Decisiones de diseño](#decisiones-de-diseño)

## Stack

- **Framework:** NestJS
- **Lenguaje:** TypeScript
- **ORM:** TypeORM
- **Base de datos:** PostgreSQL
- **Autenticación:** Passport + JWT (`@nestjs/passport`, `@nestjs/jwt`, `passport-jwt`)
- **Validación:** `class-validator` + `class-transformer`
- **Hashing:** bcrypt
- **Seguridad:** helmet + `@nestjs/throttler`

## Arquitectura

```
src/
├── entities/
│   ├── user.entity.ts
│   └── notification.entity.ts
├── auth/
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── dto/user.dto.ts
│   ├── strategies/jwt.strategy.ts
│   └── user/
│       ├── user.service.ts
│       ├── user.interface.ts
│       ├── user-service.token.ts
│       ├── authenticated-user.interface.ts
│       └── jwt-auth.guard.ts
├── notifications/
│   ├── notifications.controller.ts
│   ├── notifications.module.ts
│   ├── notification.service.ts
│   ├── notification.interface.ts
│   ├── notification-service.token.ts
│   ├── dto/
│   │   ├── notification.dto.ts
│   │   └── pagination-query.dto.ts
│   └── senders/
│       ├── notification-sender.interface.ts
│       ├── base-notification.sender.ts
│       ├── notification-dispatcher.service.ts
│       ├── notification-sender.token.ts
│       ├── email-sender.service.ts
│       ├── sms-sender.service.ts
│       ├── push-sender.service.ts
│       └── payloads/
│           ├── email-payload.dto.ts
│           ├── sms-payload.dto.ts
│           └── push-payload.dto.ts
├── filters/
│   └── all-exceptions.filter.ts
├── decorators/
│   └── current-user.decorator.ts
├── config/configuration.ts
├── migrations/
├── data-source.ts
├── app.module.ts
└── main.ts
```

**Capas:**
- **Controller** — recibe la request, delega al service, no contiene lógica de negocio.
- **Service** — lógica de negocio y acceso a datos (vía `Repository<Entity>` de TypeORM).
- **DTOs** — contrato de entrada, validado con `class-validator`.
- **Senders** — estrategias de envío por canal (ver [Decisiones de diseño](#decisiones-de-diseño)).

## Requisitos previos

- Node.js 18+
- PostgreSQL 14+ (o Docker, ver abajo)

## Instalación

```bash
npm install
cp .env.example .env      # completar con tus credenciales locales
docker compose up -d      # levanta Postgres 16 con healthcheck
npm run migration:run
npm run start:dev
```

Swagger queda en `http://localhost:3000/docs`.

Si preferís tu propio Postgres en vez del contenedor, salteá el `docker compose up` y apuntá las variables `DB_*` a tu instancia.

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `PORT` | Puerto de la app | `3000` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base de datos | `notifications_db` |
| `DB_USER` | Usuario de la DB | `postgres` |
| `DB_PASSWORD` | Password de la DB | `postgres` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | `un-secreto-largo-random` |
| `JWT_EXPIRES_IN` | Expiración del token | `1h` |

El `docker-compose.yml` lee `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `DB_PORT` del mismo `.env`.

## Scripts disponibles

```bash
npm run start:dev          # levanta la app en modo watch
npm run build
npm run lint               # eslint + prettier (con --fix)
npm test                   # unitarios, no necesitan DB
npm run test:e2e           # e2e, necesita la DB levantada y migrada

# Migraciones (desarrollo, usa ts-node)
npm run migration:create -- src/migrations/NombreMigracion    # migración vacía (SQL manual)
npm run migration:generate -- src/migrations/NombreMigracion  # autogenerada por diff de entities
npm run migration:run
npm run migration:revert

# Migraciones (producción, requiere build previo)
npm run build
npm run migration:run:prod
npm run migration:revert:prod
```

## Migraciones

Corren en orden según el timestamp del nombre de archivo/clase:

1. `CreatePgExtensions` — instala `uuid-ossp` (requerida para `uuid_generate_v4()`).
2. `UserNotifications` — tablas `user` y `notification` con su FK e índice.
3. `AddUserEmailUnique` — constraint `UNIQUE` sobre `user.email`.
4. `AddNotificationErrorMessage` — columna `errorMessage`.

## Endpoints

### Auth (`/auth`)

| Método | Ruta | Protegido | Descripción |
|---|---|---|---|
| POST | `/auth/signup` | No | Registra un usuario nuevo (409 si el email ya existe) |
| POST | `/auth/login` | No | Autentica y regresa un JWT (máx. 5 intentos/min) |
| GET | `/auth/me` | Sí | Perfil del usuario autenticado |
| POST | `/auth/reset-password/request` | No | Genera un token de reseteo (máx. 5/min) |
| POST | `/auth/reset-password/confirm` | No | Aplica el nuevo password con el token |

### Notifications (`/notifications`)

Todas las rutas requieren JWT (`Authorization: Bearer <token>`) y operan siempre sobre las notificaciones del usuario autenticado (no existe vista de admin).

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/notifications` | Crea una notificación y dispara su envío por el canal indicado |
| GET | `/notifications?page=1&limit=20` | Lista paginada, más nuevas primero |
| GET | `/notifications/:id` | Detalle de una notificación propia |
| PATCH | `/notifications/:id` | Actualiza título/contenido/metadata (el canal no es editable) |
| DELETE | `/notifications/:id` | Elimina una notificación propia (204) |

`GET /notifications` devuelve `{ data, total, page, limit }`. `limit` tiene un techo de 100.

### Shape de error

Todos los errores de la API tienen la misma forma:

```json
{
  "statusCode": 400,
  "message": ["deviceToken should not be empty"],
  "error": "Bad Request",
  "path": "/notifications",
  "timestamp": "2026-08-13T18:05:44.133Z"
}
```

`message` es un array cuando el error viene de la validación de DTOs (un item por campo), y un string en el resto de los casos.

## Payloads por canal

El campo `metadata` transporta los datos propios de cada canal. Cada sender declara qué espera, y se valida **antes** de persistir:

| Canal | `metadata` | Reglas extra |
|---|---|---|
| `email` | `{ to?: string }` — si falta, usa el email de la cuenta | `to` debe ser un email válido |
| `sms` | `{ phoneNumber: string }` — **requerido** | E.164; `content` máximo 160 caracteres |
| `push` | `{ deviceToken: string }` — **requerido** | — |

Un payload inválido devuelve **400** y no escribe nada en la base.

## Decisiones de diseño

### Autenticación y autorización

- Passport + JWT estándar, con `sub` como claim del id de usuario (convención RFC 7519).
- El `userId` nunca se recibe del body — siempre se resuelve desde `req.user` (JWT) vía el decorador `@CurrentUser()`.
- Acceso a recursos ajenos: las queries filtran siempre por `{ id, userId }` **en conjunto**, devolviendo `404` en vez de `403` para no confirmarle a un tercero que el recurso existe.
- `password`, `reset_password_token` y `reset_password_expires` están marcados `select: false`: el hash no viaja en un `find()` casual. Quien lo necesita (`validateUser`) lo pide con un `select` explícito.

### Unicidad del email

La constraint `UNIQUE` vive en la base, no solo en el código. El chequeo previo en `signUp()` es un fast-path amable (evita hashear de más), pero no garantiza nada: entre el `SELECT` y el `INSERT` hay una ventana en la que otra request puede insertar el mismo email. Quien cierra la carrera es Postgres, y el error `23505` se traduce a `ConflictException`.

### Envío de notificaciones: Strategy + Template Method

Cada canal implementa `NotificationSenderInterface`. La forma compartida —resolver destinatario, armar payload, entregar, registrar— vive una sola vez en `BaseNotificationSender`:

```
BaseNotificationSender implements NotificationSenderInterface   // QUÉ cumple
EmailNotificationSender extends BaseNotificationSender          // CÓMO lo cumple
```

**`send()` es concreto a propósito, no abstracto.** Es la invariante del contrato: todo canal valida antes de formatear y formatea antes de registrar. Si `send()` fuera abstracto, una subclase podría registrar un envío que nunca se validó, rompiendo LSP sin romper la compilación. Los **pasos** son los abstractos; el **orden** no se negocia. Hay un test que lo fija.

`deliver()` es un *hook*: método opcional con default no-op, a diferencia de los abstractos que son obligatorios. Marca el punto exacto donde entraría SendGrid/Twilio/FCM. Este proyecto simula el envío, así que hoy ninguna subclase lo sobrescribe.

**Agregar un canal nuevo no toca la lógica de despacho ni el service.** Sí toca la composición del módulo, que es donde se declara qué senders existen:

1. Crear la clase que extiende `BaseNotificationSender` (con su `payloadDto` si necesita datos extra).
2. Registrarla en `providers` y en el array del `useFactory` de `NotificationsModule`.

Nada de `switch (channel)` en el service, el dispatcher ni la validación.

### Validación por canal sin condicionales

Cada sender aporta dos cosas:

- `payloadDto` — el DTO que describe lo que espera en `metadata`.
- `validateDraft(draft)` — reglas que miran la notificación entera, para lo que no entra en un DTO de metadata (el límite de 160 del SMS mira `content`, que es común a todos los canales).

`NotificationDispatcherService.validateDraft()` resuelve el sender por el mapa que ya usaba para despachar y aplica ambos. El canal trae su propio contrato; el dispatcher solo lo ejecuta.

### Inversión de dependencias con tokens

Las interfaces de TypeScript se borran al compilar, así que no sirven como token de inyección. Sin un `Symbol` de por medio, un controller no tiene más remedio que pedir la clase concreta — y entonces la interfaz no invierte nada: es una *header interface*, ceremonia sin sustituibilidad.

Por eso `NOTIFICATION_SERVICE` y `USER_SERVICE`. El módulo es el único lugar que conoce la clase concreta; los controllers compilan contra `NotificationInterface` / `UserInterface` y un test puede pasarles un fake sin tocar TypeORM.

### Transacciones (y su límite)

La creación corre dentro de `dataSource.transaction()`: guardado + intento de envío + actualización de estado, atómico.

**Esto se sostiene porque los senders son simulados.** Con un proveedor real nunca se mantiene una transacción abierta sobre una llamada de red: bloquea una conexión del pool durante todo el round-trip y un timeout del proveedor se lleva puesta la transacción. La forma correcta ahí es *commit en `PENDING` → dispatch → update del estado*, o directamente un outbox si hace falta garantía de entrega. `PENDING` existe justamente para ser un estado recuperable.

La validación del payload, en cambio, corre **fuera y antes** de la transacción: si el canal rechaza el payload es un 400, y la base nunca se entera.

### Resultado del envío en la misma tabla

El estado del envío vive en `Notification` (`status`, `sentAt`, `errorMessage`), no en una entidad de log separada: no se requieren múltiples intentos ni auditoría histórica para este alcance.

Un envío fallido devuelve **201 con `status: "failed"`**, no un 5xx: la notificación se creó correctamente, lo que falló fue la entrega. El motivo queda en `errorMessage` y en el log. Los errores que sí son culpa del request (payload inválido) se atajan antes y devuelven 400.

### Enums en vez de strings libres

`channel` y `status` usan enums de TypeORM en vez de `string` — la base rechaza valores fuera del set permitido. Los tres canales son fijos y conocidos de antemano; una tabla aparte se justificaría solo si el negocio pudiera agregar canales dinámicamente.

### Seguridad

- **helmet** con `contentSecurityPolicy: false` (la CSP rompe el UI de Swagger, que carga assets inline).
- **Throttler**: techo global de 100 req/min, y 5/min en `login` y `reset-password/request`.
- **Anti-enumeración**: `/auth/reset-password/request` responde lo mismo exista o no el email. Antes devolvía 404 cuando no existía, o sea que servía para averiguar qué direcciones están registradas.
- **Token de reseteo hasheado**: se persiste `sha256(token)` y se devuelve el crudo. Una filtración de la tabla deja de ser account takeover.
- El `resetToken` viaja en la respuesta HTTP **solo fuera de producción**, para poder probar el flujo sin servidor de mail. En producción se omite y la respuesta es idéntica en ambos casos.

### Deuda conocida

- `JwtStrategy.validate()` no verifica que el usuario siga existiendo: un token sigue siendo válido hasta que expira aunque se borre la cuenta. Evitarlo cuesta una query por request; con `expiresIn: 1h` la ventana es acotada.
- El throttler usa el storage en memoria, que no sirve con más de una instancia. Con varias réplicas hay que moverlo a Redis.
