# nestjs-notification

API REST de notificaciones multicanal (email, SMS, push) con autenticación JWT. Es la implementación NestJS de un diseño compartido con una versión FastAPI: mismo contrato HTTP, mismo dominio y mismo esquema de base de datos. Solo cambia el stack.

- Diseño: [`../docs/diseno-notificaciones.md`](../docs/diseno-notificaciones.md)
- Contrato HTTP formal: [`../contract/openapi.yaml`](../contract/openapi.yaml)
- Decisiones de arquitectura (ADR): [`../docs/adr`](../docs/adr)

## Stack

NestJS 11 · TypeScript · TypeORM · PostgreSQL 16 · Passport + JWT (`@nestjs/jwt`) · bcrypt · helmet · `@nestjs/throttler` · class-validator · Swagger · Jest

## Estructura (hexagonal, [ADR-001](../docs/adr/001-arquitectura-hexagonal.md))

```
src/
  domain/           # User, Email, PasswordResetToken, Notification, ChannelPolicy, errores.
                    # No importa @nestjs, typeorm ni class-validator.
  application/      # casos de uso + puertos (interfaces con token Symbol)
    ports/          # repositorios, PasswordHasher, TokenIssuer, Clock, IdGenerator, ChannelGateway...
    use-cases/      # Register, Login, GetCurrentUser, Request/ConfirmPasswordReset,
                    # Create, List, Get, Revise, DeleteNotification
    testing/        # fakes en memoria de los puertos (solo para tests)
  infrastructure/   # adaptadores
    persistence/    # entidades TypeORM, mappers, repositorios
    channels/       # gateways simulados
    security/       # BcryptPasswordHasher, JwtTokenIssuer, CryptoResetTokenGenerator
    clock/ ids/     # SystemClock, UuidIdGenerator
  api/              # controllers, DTOs (class-validator), pipes, filtro de Problem Details
  migrations/       # migraciones de TypeORM
  app.module.ts, auth.module.ts, notifications.module.ts, common.module.ts
                    # raíz de composición: lo único que conoce las clases concretas
```

La entidad TypeORM no es la entidad de dominio: un mapper traduce entre ambas. Los casos de uso reciben la hora y los ids por los puertos `Clock` e `IdGenerator` ([ADR-009](../docs/adr/009-transiciones-de-notification.md), [ADR-003](../docs/adr/003-uuid-en-el-dominio.md)).

## Puesta en marcha

Requisitos: Node 22 y Docker.

```bash
cp .env.example .env        # y fija JWT_SECRET (ver tabla)
npm install
```

### Modo local (app con npm, base en Docker)

```bash
docker compose up -d        # solo Postgres (contenedor nestjs-notification-db)
npm run migration:run       # aplica las migraciones
npm run start:dev           # app en http://localhost:3000
```

### Todo containerizado (perfil `full`)

```bash
docker compose --profile full up -d --build   # db + migrate (una corrida) + app
```

`migrate` ejecuta `npm run migration:run:prod` y la app no arranca hasta que termine bien. El healthcheck de la app usa `GET /`.

Swagger UI en `/docs` y el documento OpenAPI en `/docs-json`.

### Variables de entorno

| Variable | Defecto | Efecto |
|---|---|---|
| `NODE_ENV` | `development` | Con `production`, `POST /auth/password-reset/request` **no** devuelve `resetToken`; en cualquier otro valor lo devuelve si el email existe. En compose, `migrate` y `app` fuerzan `production`. |
| `PORT` | `3000` | Puerto de la app. |
| `APP_PORT` | `3000` | Puerto del host para la app del perfil `full`. |
| `DB_HOST` | — | Host de Postgres. En compose se pisa por `postgres`. |
| `DB_PORT` | `5432` | Puerto de Postgres **en el host** (también lo usa compose para mapear). Si el 5432 está ocupado, usa p. ej. `5433`. Dentro de compose siempre es `5432`. |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | `postgres`, `postgres`, `notifications_db` | Credenciales y base; compose las usa también para crear Postgres. |
| `JWT_SECRET` | `dev-only-insecure-secret-change-me` fuera de producción | Secreto HS256. **En producción es obligatorio, de ≥ 32 caracteres y distinto de los valores de desarrollo: si no, la app no arranca** (ADR-015). Genera uno con `openssl rand -hex 32`. |
| `JWT_EXPIRES_IN_SECONDS` | `3600` | Vigencia del access token; es el `expiresIn` de `/auth/login`. |
| `RESET_TOKEN_EXPIRES_MINUTES` | `15` | Vigencia del token de reseteo de contraseña. |

La configuración se lee en `src/config/configuration.ts`; los valores numéricos inválidos caen al defecto.

### Comandos

```bash
npm run start:dev           # desarrollo con recarga
npm run build               # compila a dist/
npm run start:prod          # node dist/main
npm run lint                # eslint --fix
npm test                    # tests unitarios
npm run test:e2e            # tests e2e
npm run migration:run       # aplica migraciones pendientes (ts-node)
npm run migration:revert    # revierte la última
npm run migration:generate -- src/migrations/Nombre
npm run migration:run:prod  # igual que run, sobre dist/ (lo usa el perfil full)
```

Nunca se usa `synchronize: true`: el esquema solo cambia con migraciones, que se generan y se revisan a mano.

## Endpoints

JSON en camelCase. Todas las rutas de `/notifications` exigen `Authorization: Bearer <accessToken>` y operan solo sobre las notificaciones del usuario autenticado. Los errores se devuelven como Problem Details; cualquier ruta protegida sin token válido responde 401.

| Método | Ruta | Éxito | Errores |
|---|---|---|---|
| POST | `/auth/register` | 201 `{ id, email, createdAt }` | 400, 409 (email ya registrado) |
| POST | `/auth/login` | 200 `{ accessToken, tokenType: "Bearer", expiresIn }` | 400, 401, 429 |
| GET | `/auth/me` | 200 `{ id, email, createdAt }` | 401 |
| POST | `/auth/password-reset/request` | 202 `{ message, resetToken? }` | 400, 429 |
| POST | `/auth/password-reset/confirm` | 200 `{ message }` | 400 (token inexistente, vencido o usado) |
| POST | `/notifications` | 201 `Notification` (`sent` o `failed`) | 400, 401 |
| GET | `/notifications?page=1&limit=20` | 200 `{ data, total, page, limit }` | 400, 401 |
| GET | `/notifications/{id}` | 200 `Notification` | 401, 404 |
| PATCH | `/notifications/{id}` | 200 `Notification` tras el reenvío | 400, 401, 404, 409 |
| DELETE | `/notifications/{id}` | 204 | 401, 404 |

Detalles:

- Contraseña: 8 a 128 caracteres (register y confirm). `limit` va de 1 a 100; `page ≥ 1`.
- Listado: más nuevas primero, orden determinístico por `(created_at desc, id desc)`.
- Creación: `{ "title", "content", "channel": "email|sms|push", "payload": { "recipient" } }`. Edición: todos los campos opcionales y `channel` no se acepta (se rechaza como propiedad desconocida); un cuerpo vacío es 400.
- Los DTOs rechazan propiedades desconocidas.

Ejemplo de `Notification`:

```json
{ "id": "uuid", "title": "Hola", "content": "…", "channel": "sms",
  "payload": { "recipient": "+5219611234567" }, "status": "sent", "attempts": 1,
  "errorMessage": null, "sentAt": "2026-10-14T12:00:00.000Z",
  "createdAt": "2026-10-14T12:00:00.000Z", "updatedAt": "2026-10-14T12:00:00.000Z" }
```

## Errores: Problem Details (RFC 9457)

Los errores salen como `application/problem+json` con `type = https://errors.local/<slug>` ([ADR-006](../docs/adr/006-problem-details.md), tabla completa en [ADR-012](../docs/adr/012-adaptadores-de-notificaciones.md) y [ADR-014](../docs/adr/014-adaptadores-de-auth.md)). Nunca se filtran trazas.

| Caso | HTTP | slug |
|---|---|---|
| Validación de request (body, query) | 400 | `validation-error` |
| Canal inexistente | 400 | `unknown-channel` |
| Regla del canal violada | 400 | `channel-rule-violation` |
| Token de reseteo inválido | 400 | `invalid-reset-token` |
| Token ausente/inválido, credenciales incorrectas | 401 | `unauthorized` |
| Notificación inexistente o ajena; id con formato inválido | 404 | `notification-not-found` |
| Notificación no editable (estado ≠ `failed`) | 409 | `notification-not-editable` |
| Email ya registrado | 409 | `email-already-registered` |
| Límite de peticiones | 429 | `too-many-requests` |
| Error no controlado | 500 | `internal-error` |

```json
{ "type": "https://errors.local/channel-rule-violation", "title": "Channel rule violation",
  "status": 400, "detail": "…", "instance": "/notifications",
  "errors": [{ "field": "payload.recipient", "message": "…" }] }
```

## Reglas de dominio observables

- Estados de una notificación: `pending` → `sent` | `failed`. Un `failed` editado vuelve a `pending` y se reenvía. `sent` es terminal ([ADR-009](../docs/adr/009-transiciones-de-notification.md)).
- **Solo se edita una notificación `failed`**; en otro estado, `PATCH` responde 409. Editar implica reenviar ([ADR-007](../docs/adr/007-solo-editar-failed.md)). El canal no cambia nunca: para otro canal, se crea otra notificación.
- Borrar se permite en cualquier estado.
- Una notificación inexistente o de otro usuario responde **404, no 403**, para no revelar su existencia.
- Reglas por canal ([ADR-010](../docs/adr/010-reglas-de-canal.md)): email requiere dirección válida; **SMS** requiere teléfono E.164 y `content` de **160 caracteres como máximo (se rechaza, no se trunca)**; push requiere un device token con formato válido. Un payload inválido es 400 y no escribe nada.
- Si el payload es válido pero la entrega falla, la respuesta es **201 con `status: "failed"`** (`attempts`, `errorMessage`), no un error HTTP.
- `attempts` aumenta en cada intento de entrega.

## Flujo de envío sin transacción abierta ([ADR-008](../docs/adr/008-sin-transaccion-en-entrega.md))

Create y Revise comparten el mismo final (`DeliverNotification`): validar con la política del canal, guardar `pending` (commit), entregar por el gateway, `markSent`/`markFailed` y guardar de nuevo (commit). Nunca hay una transacción abierta durante la entrega, así que `pending` es el estado recuperable si el proceso cae entre ambos commits. Un gateway que lanza una excepción cuenta como entrega fallida.

## Canales y gateways simulados

Cada canal tiene una **política** en el dominio (valida y formatea, sin I/O) y un **gateway** en infraestructura (entrega) ([ADR-005](../docs/adr/005-politica-vs-gateway.md)). Hoy los gateways son simulados y deterministas para poder probar `failed` y la edición ([ADR-012](../docs/adr/012-adaptadores-de-notificaciones.md)):

| Canal | Falla si el destinatario… |
|---|---|
| email, push | en minúsculas contiene `fail` |
| sms | termina en `0000` |

En cualquier otro caso la entrega es exitosa. Un fallo guarda `Simulated delivery failure` como `errorMessage`, y cada entrega queda en el log. Editar el destinatario a uno válido convierte un `failed` en `sent`.

### Agregar un canal (p. ej. WhatsApp)

1. `domain/channels/whatsapp.policy.ts`: implementa `ChannelPolicy` (validación y `OutboundMessage`).
2. Un gateway que implemente `ChannelGateway` en `infrastructure/channels/`.
3. Registrar ambos en `src/notifications.module.ts` (`ChannelPolicyRegistry` y `createSimulatedGateways`/registro de gateways).

No cambian los casos de uso, los controllers, los DTOs ni las migraciones: `channel` es un `varchar` y el registro decide qué canales existen ([ADR-004](../docs/adr/004-channel-varchar-y-registro.md)). No debe haber `if` ni `switch` por canal fuera de ese registro.

## Seguridad ([ADR-014](../docs/adr/014-adaptadores-de-auth.md), [ADR-013](../docs/adr/013-dominio-y-casos-de-uso-de-auth.md))

- **Contraseñas:** bcrypt (coste 10). bcrypt solo lee 72 bytes y el contrato admite 128 caracteres, así que si la contraseña supera 72 bytes UTF-8 se aplica antes sha256 → base64.
- **JWT sin estado:** HS256 con `sub`, `iat`, `exp` y `type: "access"`. El guard valida firma, expiración y tipo sin consultar la base; solo `/auth/me` carga al usuario.
- **Reseteo de contraseña:** el token en claro nunca se guarda ni se loguea; se persiste su sha256. Uso único (`UPDATE … WHERE used_at IS NULL`, seguro bajo concurrencia) y vigencia de `RESET_TOKEN_EXPIRES_MINUTES`. En producción todavía no hay canal que entregue el token (falta un gateway de email).
- **Anti-enumeración:** `password-reset/request` responde igual exista o no el email; `login` responde igual ante email inexistente o contraseña errónea, y verifica contra un hash señuelo para no filtrar por tiempo.
- **Rate limit:** `POST /auth/login` y `POST /auth/password-reset/request`, 5 por minuto por IP, con 429. El contador vive en memoria: **es por proceso**, válido para una sola instancia. Hay además un techo global laxo de 100 peticiones por minuto por IP.
- helmet activo (sin CSP, para que cargue Swagger UI) y body limitado a 1 MB.

## Base de datos

Esquema en la sección 5 del diseño: `users`, `password_reset_tokens` y `notifications`, con columnas en snake_case (nombres explícitos en las entidades), FK con `ON DELETE CASCADE` e índice `(user_id, created_at desc, id desc)`. Las migraciones conservan datos existentes y tienen `down`.

## Tests

| Comando | Qué cubre | Requiere |
|---|---|---|
| `npm test` | Unitarios: dominio, casos de uso con fakes en memoria, mappers, DTOs, filtro de Problem Details, adaptadores de seguridad, forma del OpenAPI | Nada (sin base de datos) |
| `npm run test:e2e` | HTTP de punta a punta con la app real (`/auth/*`, `/notifications`) y la migración del esquema de auth | Postgres levantado y **migrado** (`docker compose up -d` + `npm run migration:run`) con las variables de `.env`. La prueba de migración crea y borra una base temporal, por lo que el usuario necesita permiso `CREATEDB`. |
