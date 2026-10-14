# nestjs-notification

Implementación en NestJS del diseño compartido (`../docs/diseno-notificaciones.md`). Las reglas comunes viven en `../CLAUDE.md`.

## Stack

NestJS · TypeScript · TypeORM · PostgreSQL · Passport + JWT · bcrypt · helmet · `@nestjs/throttler` · Jest

## Comandos

```bash
docker compose up -d                       # solo Postgres (puerto DB_PORT del .env)
npm run start:dev                          # app en :3000, Swagger en /docs
npm run lint                               # eslint --fix
npm test                                   # unitarios, sin base de datos
npm run test:e2e                           # e2e, requiere la base levantada y migrada
npm run migration:generate -- src/migrations/Nombre
npm run migration:run
npm run migration:revert
docker compose --profile full up -d --build   # todo containerizado (db + migrate + app)
```

## Estructura (hexagonal)

```
src/
  domain/           # User, Notification, PasswordResetToken, ChannelPolicy, errores. Sin @nestjs ni typeorm.
  application/      # casos de uso + puertos (interfaces + tokens Symbol)
  infrastructure/
    persistence/    # entidades TypeORM, mappers, repositorios (las migraciones viven en src/migrations/)
    channels/       # ChannelGateway por canal (simulados)
    security/       # BcryptHasher, JwtTokenIssuer
  api/              # controllers, DTOs (class-validator), filtro de Problem Details
  *.module.ts       # raíz de composición: único lugar que conoce las clases concretas
```

## Convenciones

- Inyección por token: `@Inject(NOTIFICATION_REPOSITORY)` y nunca la clase concreta.
- Columnas en snake_case (`SnakeNamingStrategy` o `name:` explícito).
- Los DTOs de `class-validator` viven solo en `api/`; el dominio valida sus propias invariantes.
- Las migraciones se generan y se revisan a mano; nunca se usa `synchronize: true`.

## Estado respecto al diseño

Sin pendientes: el stack implementa el diseño completo (notificaciones y auth) y cumple `../contract/openapi.yaml`. Las decisiones están en `../docs/adr/` (001–014). Si el diseño cambia, se corrige primero allí.
