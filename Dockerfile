# Multi-stage build for JurisAI Pro on Render / Docker
FROM node:22-slim AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies including devDependencies
RUN npm ci

# Copy full source code
COPY . .

# Build Vite frontend and bundle server.ts -> server.js
RUN npm run build

# Production runtime stage
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

# Copy production files and node_modules
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

EXPOSE 10000

CMD ["node", "server.js"]
