# Build stage
FROM node:23-alpine AS builder
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Build Next.js
RUN npm run build

# Runner stage
FROM node:23-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Re-create next.config.ts for the runner if needed (standalone mode copies it though)
# But standard standalone mode requires some specific copies:
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
