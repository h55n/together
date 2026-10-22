FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
COPY content/package.json content/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS server-build
COPY . .
RUN pnpm --filter @together/server... build

FROM dependencies AS web-build
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SERVER_URL=""
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY"
RUN pnpm --filter @together/client... build

FROM node:24-bookworm-slim AS server
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
COPY content/package.json content/package.json
RUN pnpm install --prod --frozen-lockfile --filter @together/server...
COPY --from=server-build /app/server/dist server/dist
COPY --from=server-build /app/shared/dist shared/dist
COPY --from=server-build /app/content/dist content/dist
ENV NODE_ENV=production
ENV PORT=3001
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3001/readyz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/dist/index.js"]

FROM caddy:2-alpine AS web
COPY --from=web-build /app/client/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
