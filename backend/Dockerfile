# =============================================================================
# Stage 1: Install deps & compile TypeScript
# =============================================================================
FROM node:18-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

COPY tsconfig.json ./
COPY src ./src/

RUN npx prisma generate \
    && npm run build \
    && cp -r src/locales dist/locales

# =============================================================================
# Stage 2: Production runtime (production dependencies only)
# =============================================================================
FROM node:18-alpine AS production

RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist

RUN apk del python3 make g++

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "dist/main.js"]
