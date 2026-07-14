# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app

# ---------- deps ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# standalone 빌드는 실제 시크릿이 필요 없음(런타임에 주입). 빌드 통과용 더미 값.
ENV AUTH_SECRET=build-time-dummy
RUN npm run build

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/maple.db

# better-sqlite3 네이티브 모듈 실행에 필요한 최소 런타임
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data && chown node:node /data

# standalone 산출물 + 정적 파일 + 마이그레이션
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle

USER node
VOLUME /data
EXPOSE 3000
CMD ["node", "server.js"]
