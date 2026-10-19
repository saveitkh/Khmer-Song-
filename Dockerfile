# ── Build stage: install everything and build the PWA ────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install with the workspace manifests first for better layer caching.
COPY package.json package-lock.json* ./
COPY web/package.json ./web/
COPY server/package.json ./server/
RUN npm install

# Build the web PWA into web/dist, then drop dev deps so only runtime
# dependencies (express/cors/zod/dotenv) remain in node_modules.
COPY . .
RUN npm run build && npm prune --omit=dev

# ── Runtime stage: Node serves the built PWA + the API ───────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/web/dist ./web/dist

EXPOSE 3000

# Container healthcheck hits the public /api/health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/src/index.js"]
