FROM node:22.17.0-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install
COPY . .
RUN pnpm run build

FROM alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist