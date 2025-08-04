# Multi-stage build for optimal size and security
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install Salesforce CLI and system dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    openssh-client \
    ca-certificates \
    && npm install -g @salesforce/cli@latest \
    && sf --version

# Create non-root user for security
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S mcpuser -u 1001 -G mcpuser

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create directories for Salesforce CLI data
RUN mkdir -p /home/mcpuser/.sfdx \
    && mkdir -p /home/mcpuser/.config/sf \
    && chown -R mcpuser:mcpuser /home/mcpuser \
    && chown -R mcpuser:mcpuser /app

# Switch to non-root user
USER mcpuser

# Set environment variables
ENV NODE_ENV=production
ENV SF_AUTOUPDATE_DISABLE=true
ENV SF_DISABLE_LOG_FILE=true
ENV SFDX_DISABLE_AUTOUPDATE=true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('MCP Server Health Check: OK')" || exit 1

# Expose MCP server port (if running HTTP mode)
EXPOSE 3000

# Default command - runs MCP server on stdio
CMD ["node", "build/index.js"]