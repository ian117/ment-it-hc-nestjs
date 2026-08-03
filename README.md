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
- [Decisiones de diseño](#decisiones-de-diseño)

## Stack

- **Framework:** NestJS
- **Lenguaje:** TypeScript
- **ORM:** TypeORM
- **Base de datos:** PostgreSQL
- **Autenticación:** Passport + JWT (`@nestjs/passport`, `@nestjs/jwt`, `passport-jwt`)
- **Validación:** `class-validator` + `class-transformer`
- **Hashing:** bcrypt

## Arquitectura

```
src/
├── entities/
│   ├── user.entity.ts
│   └── notification.entity.ts
├── auth/
│   ├── auth.controller.ts
│   ├── jwt.strategy.ts
│   ├── jwt-auth.guard.ts
│   ├── current-user.decorator.ts
│   └── dto/
├── user/
│   ├── user.service.ts
│   ├── user.interface.ts
│   └── user.module.ts
├── notification/
│   ├── notification.controller.ts
│   ├── notification.service.ts
│   ├── notification.interface.ts
│   ├── notification.module.ts
│   ├── senders/
│   │   ├── notification-sender.interface.ts
│   │   ├── notification-dispatcher.service.ts
│   │   ├── notification-senders.token.ts
│   │   ├── email-sender.service.ts
│   │   ├── sms-sender.service.ts
│   │   └── push-sender.service.ts
│   └── dto/
├── config/
│   └── configuration.ts
├── data-source.ts
├── app.module.ts
└── main.ts
```

**Capas:**
- **Controller** — recibe la request, delega al service, no contiene lógica de negocio.
- **Service** — lógica de negocio y acceso a datos (vía `Repository<Entity>` de TypeORM).
- **DTOs** — contrato de entrada/salida, validado con `class-validator`.
- **Senders** — estrategias de envío por canal (ver [Decisiones de diseño](#decisiones-de-diseño)).

## Requisitos previos

- Node.js 18+
- PostgreSQL 14+
- Extensión `uuid-ossp` habilitada en la base de datos (se instala vía migración)

## Instalación

```bash
npm install
cp .env.example .env   # completar con tus credenciales locales
npm run migration:run
npm run start:dev
```

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto de la app | `3000` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base de datos | `notifications_db` |
| `DB_USER` | Usuario de la DB | `postgres` |
| `DB_PASSWORD` | Password de la DB | `postgres` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | `un-secreto-largo-random` |
| `JWT_EXPIRES_IN` | Expiración del token | `1h` |

## Scripts disponibles

```bash
npm run start:dev          # levanta la app en modo watch

# Migraciones (desarrollo, usa ts-node)
npm run migration:create -- src/migrations/NombreMigracion   # migración vacía (SQL manual)
npm run migration:generate -- src/migrations/NombreMigracion  # migración autogenerada por diff de entities
npm run migration:run
npm run migration:revert

# Migraciones (producción, requiere build previo)
npm run build
npm run migration:run:prod
npm run migration:revert:prod

npm run format              # Prettier
```

## Migraciones

Las migraciones corren en orden según el timestamp en el nombre de archivo/clase. La primera migración instala la extensión `uuid-ossp` (requerida para `uuid_generate_v4()`), seguida de la creación de tablas `user` y `notification` con su FK.

## Endpoints

### Auth (`/auth`)

| Método | Ruta | Protegido | Descripción |
|---|---|---|---|
| POST | `/auth/signup` | No | Registra un usuario nuevo |
| POST | `/auth/login` | No | Autentica y regresa un JWT |
| GET | `/auth/me` | Sí | Perfil del usuario autenticado |
| POST | `/auth/reset-password/request` | No | Genera un token de reseteo |
| POST | `/auth/reset-password/confirm` | No | Aplica el nuevo password con el token |

### Notifications (`/notifications`)

Todas las rutas requieren JWT (`Authorization: Bearer <token>`) y operan siempre sobre las notificaciones del usuario autenticado (no existe vista de admin).

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/notifications` | Crea una notificación y dispara su envío por el canal indicado |
| GET | `/notifications` | Lista las notificaciones del usuario autenticado |
| GET | `/notifications/:id` | Detalle de una notificación propia |
| PATCH | `/notifications/:id` | Actualiza título/contenido/metadata (el canal no es editable) |
| DELETE | `/notifications/:id` | Elimina una notificación propia |

## Decisiones de diseño

### Autenticación

- Passport + JWT estándar, con `sub` como claim del id de usuario (convención RFC 7519).
- El `userId` nunca se recibe del body — siempre se resuelve desde `req.user` (JWT) vía el decorador `@CurrentUser()`.
- Acceso a recursos ajenos: las queries filtran siempre por `{ id, userId }` en conjunto, devolviendo `404` en vez de `403` para no confirmar la existencia del recurso a un usuario no autorizado.

### Envío de notificaciones (Strategy + Open/Closed Principle)

Cada canal (Email, SMS, Push) implementa `NotificationSenderInterface` de forma aislada, con su propia validación y lógica de envío. Un `NotificationDispatcherService` resuelve el sender correspondiente a través de un mapa (`channel → sender`) construido por inyección de dependencias, sin condicionales tipo `if/switch`.

**Agregar un canal nuevo no requiere modificar código existente** — solo:
1. Crear una clase que implemente `NotificationSenderInterface`.
2. Registrarla en `providers` y en el array del `useFactory` de `NotificationModule`.

### Transacciones

La creación de notificaciones (guardado + intento de envío + actualización de estado) corre dentro de `dataSource.transaction()`, garantizando atomicidad y liberación automática de la conexión sin importar el resultado.

### Enums en vez de strings libres

`channel` y `status` usan enums de TypeORM (`NotificationChannelEnum`, `NotificationStatusEnum`) en vez de `string` — la base de datos rechaza valores fuera del set permitido.