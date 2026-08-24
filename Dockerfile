# ============================================================================
# Multi-stage Dockerfile for HACCP API
# Optimized for production deployment with minimal image size
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: Dependencies
# ----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Install build tools required by bcrypt native module on Alpine
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production && \
    npm cache clean --force

# ----------------------------------------------------------------------------
# Stage 2: Build
# ----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN mkdir -p web website uploads && npm run build

# ----------------------------------------------------------------------------
# Stage 3: Production
# ----------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Set to production
ENV NODE_ENV=production

# Copy node_modules from deps stage
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Overlay generated Prisma client from builder stage (deps stage lacks the schema-aware client)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/web ./web
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Copy uploads directory structure (ensure it exists)
RUN mkdir -p web website uploads/exports uploads/pms && \
    chown -R nestjs:nodejs web website uploads

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main"]

