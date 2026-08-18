# =============================================================================
# Stage 1: Build React/Vite app
# =============================================================================
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching when source changes)
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=https://needforfit-app.withkris.life/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# =============================================================================
# Stage 2: Serve static assets with Nginx
# =============================================================================
FROM nginx:1.27-alpine AS production

# Remove default config; use project nginx.conf
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health > /dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
