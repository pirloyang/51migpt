FROM node:22-alpine AS env-amd64
FROM node:22-alpine AS env-arm64
FROM node:18-alpine AS env-arm

FROM env-$TARGETARCH AS base

ARG TARGETARCH

FROM base AS builder

WORKDIR /build

COPY .npmrc package.json pnpm-workspace.yaml turbo.json ./
COPY packages/ packages/
COPY apps/ apps/

RUN apk add --no-cache git && npm install -g pnpm && CI=true pnpm install && pnpm run build

FROM base AS runtime

WORKDIR /app

COPY --from=builder /build/apps/example/app.js ./
COPY --from=builder /build/apps/example/config.js ./

RUN npm install --omit=dev openai@^4.91.1 proxy-agent@^6.5.0 axios@^1.8.4 pako@^2.1.0

RUN mkdir -p ./node_modules/@51migpt/next ./node_modules/@51migpt/miot ./node_modules/@51migpt/engine ./node_modules/@51migpt/chat ./node_modules/@51migpt/openai ./node_modules/@51migpt/stream ./node_modules/@51migpt/utils

COPY --from=builder /build/apps/next/package.json ./node_modules/@51migpt/next/package.json
COPY --from=builder /build/apps/next/dist ./node_modules/@51migpt/next/dist

COPY --from=builder /build/packages/miot/package.json ./node_modules/@51migpt/miot/package.json
COPY --from=builder /build/packages/miot/dist ./node_modules/@51migpt/miot/dist

COPY --from=builder /build/packages/engine/package.json ./node_modules/@51migpt/engine/package.json
COPY --from=builder /build/packages/engine/dist ./node_modules/@51migpt/engine/dist

COPY --from=builder /build/packages/chat/package.json ./node_modules/@51migpt/chat/package.json
COPY --from=builder /build/packages/chat/dist ./node_modules/@51migpt/chat/dist

COPY --from=builder /build/packages/openai/package.json ./node_modules/@51migpt/openai/package.json
COPY --from=builder /build/packages/openai/dist ./node_modules/@51migpt/openai/dist

COPY --from=builder /build/packages/stream/package.json ./node_modules/@51migpt/stream/package.json
COPY --from=builder /build/packages/stream/dist ./node_modules/@51migpt/stream/dist

COPY --from=builder /build/packages/utils/package.json ./node_modules/@51migpt/utils/package.json
COPY --from=builder /build/packages/utils/dist ./node_modules/@51migpt/utils/dist

CMD ["node", "app.js"]
