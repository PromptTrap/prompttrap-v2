# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsup.config.ts ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build the project
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy config example
COPY prompttrap.example.yaml ./

# Create volume for config and database
VOLUME ["/app/config", "/app/data"]

# Environment variables
ENV PROMPTTRAP_CONFIG=/app/config/prompttrap.yaml
ENV NODE_ENV=production

# Expose dashboard port
EXPOSE 9099

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9099/api/activity?limit=1', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Default command runs the MCP server
CMD ["node", "dist/index.js"]
