FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:26-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY sql ./sql

# Run as the unprivileged "node" user (uid 1000). Numeric so Kubernetes can verify runAsNonRoot.
USER 1000:1000
EXPOSE 8080 9090
CMD ["node", "src/index.js"]
