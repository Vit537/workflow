# ── Stage 1: Build Angular ────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# URL del backend inyectada en build time (ej: http://alb-xxx.sa-east-1.elb.amazonaws.com:8080)
ARG BACKEND_URL=http://localhost:8080
RUN mkdir -p src/environments && \
    printf "export const environment = { production: false, apiUrl: '%s', wsUrl: '%s' };\n" "${BACKEND_URL}" "${BACKEND_URL}" > src/environments/environment.ts && \
    printf "export const environment = { production: true, apiUrl: '%s', wsUrl: '%s' };\n" "${BACKEND_URL}" "${BACKEND_URL}" > src/environments/environment.prod.ts
RUN npm run build -- --configuration production

# ── Stage 2: Serve con Nginx ──────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
