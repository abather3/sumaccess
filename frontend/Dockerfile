# Multi-stage build for React application
# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies with optimizations
RUN npm ci --no-audit --no-fund --silent

# Copy source code
COPY . .

# Build React application with memory optimization
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV GENERATE_SOURCEMAP=false
ENV CI=false
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine AS production

# Install serve globally with retry
RUN npm install -g serve --retry 3

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/build ./build

# Change to non-root user
USER nodejs

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start the application using serve
CMD ["serve", "-s", "build", "-l", "3000"]
