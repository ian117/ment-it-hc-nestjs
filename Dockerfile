# syntax=docker/dockerfile:1

# Base Debian slim y no Alpine a proposito: bcrypt es un modulo nativo y
# publica prebuilds para glibc, no para musl. Con Alpine hay que compilarlo
# a mano en cada build, que es mas lento y se rompe mas seguido.
ARG NODE_IMAGE=node:22-bookworm-slim

# ---------------------------------------------------------------------------
# deps -- solo dependencias de produccion, aisladas para copiarlas al runtime
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app

# Red de seguridad por si algun modulo nativo no encuentra prebuild y tiene
# que compilar. Vive solo en esta etapa: no viaja a la imagen final.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------------------------------------------------------------------------
# build -- necesita las devDependencies para compilar TypeScript
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---------------------------------------------------------------------------
# runtime -- sin compiladores, sin devDependencies, sin codigo fuente
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# package.json va porque los scripts de migracion se invocan con `npm run`.
COPY package.json ./

# Las imagenes de node traen el usuario `node` (uid 1000). Correr como root
# dentro del contenedor no aporta nada y amplia el radio de un escape.
USER node

EXPOSE 3000

CMD ["node", "dist/main"]
