# 🐳 Docker Setup and Configuration Guide

This guide provides comprehensive documentation for running the Salesforce CLI MCP Server in Docker containers.

## Architecture Overview

### Container Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Architecture                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   STDIO Mode    │  │   HTTP Mode     │  │  Dev Mode    │ │
│  │   (Default)     │  │  (Port 3000)    │  │ (Hot Reload) │ │
│  │                 │  │                 │  │              │ │
│  │ • Interactive   │  │ • REST API      │  │ • File Watch │ │
│  │ • STDIN/STDOUT  │  │ • Health Checks │  │ • Debug Logs │ │
│  │ • MCP Protocol  │  │ • SSE Transport │  │ • Live Updates│
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│               Shared Volumes & Networks                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ SF Auth Data    │  │ SF Config Data  │  │ Project Files│ │
│  │   (Persistent)  │  │   (Persistent)  │  │  (Mounted)   │ │
│  │                 │  │                 │  │              │ │
│  │ • Org Tokens    │  │ • CLI Settings  │  │ • Source Code│ │
│  │ • Auth Files    │  │ • User Config   │  │ • Metadata   │ │
│  │ • Certificates  │  │ • Cache Data    │  │ • Test Data  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Docker Images

### Production Image (`Dockerfile`)
- **Base**: `node:18-alpine`
- **Size**: ~150MB
- **User**: `mcpuser` (UID 1001)
- **Features**: Multi-stage build, security hardening

### HTTP Image (`Dockerfile.http`)
- **Base**: `node:18-alpine`
- **Size**: ~160MB
- **Ports**: 3000 (HTTP), health checks
- **Features**: Express server, SSE transport

### Development Image (`Dockerfile.dev`)
- **Base**: `node:18-alpine`
- **Size**: ~200MB
- **Features**: Hot reload, development tools, debugging

## Volume Management

### Persistent Volumes

```yaml
volumes:
  salesforce_auth:
    name: salesforce_auth_data
    # Stores: ~/.sfdx/
    # Contains: org auth files, certificates, tokens
    
  salesforce_config:
    name: salesforce_config_data
    # Stores: ~/.config/sf/
    # Contains: CLI configuration, cache, settings
```

### Volume Structure

```
salesforce_auth_data/
├── alias/
│   ├── mydevhub.json
│   └── mysandbox.json
├── orgs/
│   ├── username@company.com/
│   │   ├── authFile.json
│   │   └── certificate.pem
│   └── another@org.com/
└── key.json

salesforce_config_data/
├── config.json
├── cache/
└── logs/
```

## Deployment Modes

### 1. STDIO Mode (Default)

**Best for**: Direct MCP client integration (Claude Desktop, VS Code)

```bash
# Start STDIO mode
docker-compose up salesforce-mcp

# Or with script
./docker/scripts.sh run-stdio
```

**Configuration**:
```yaml
services:
  salesforce-mcp:
    build:
      context: .
      dockerfile: Dockerfile
    stdin_open: true
    tty: true
    volumes:
      - salesforce_auth:/home/mcpuser/.sfdx
      - salesforce_config:/home/mcpuser/.config/sf
```

### 2. HTTP Mode

**Best for**: REST API access, multiple clients, monitoring

```bash
# Start HTTP mode
docker-compose --profile http-mode up salesforce-mcp-http

# Or with script
./docker/scripts.sh run-http
```

**Endpoints**:
- `http://localhost:3000/health` - Health check
- `http://localhost:3000/api/status` - Server status
- `http://localhost:3000/mcp` - MCP endpoint

**Configuration**:
```yaml
services:
  salesforce-mcp-http:
    build:
      dockerfile: Dockerfile.http
    ports:
      - "3000:3000"
    environment:
      - MCP_MODE=http
      - MCP_PORT=3000
```

### 3. Development Mode

**Best for**: Development, debugging, hot reload

```bash
# Start development mode
docker-compose --profile development up salesforce-mcp-dev

# Or with script
./docker/scripts.sh run-dev
```

**Features**:
- Hot reload with nodemon
- TypeScript watch mode
- Debug logging
- Volume mounting for live updates

### 4. Inspector Mode

**Best for**: Testing, debugging MCP protocol

```bash
# Start MCP Inspector
docker-compose --profile inspector up mcp-inspector

# Or with script
./docker/scripts.sh run-inspector
```

**Access**: `http://localhost:3001`

## Environment Variables

### Production Environment

```bash
# Core settings
NODE_ENV=production
MCP_LOG_LEVEL=info

# Salesforce CLI settings
SF_AUTOUPDATE_DISABLE=true
SF_DISABLE_LOG_FILE=true
SFDX_DISABLE_AUTOUPDATE=true

# HTTP mode specific
MCP_MODE=http
MCP_PORT=3000
```

### Development Environment

```bash
# Development settings
NODE_ENV=development
MCP_LOG_LEVEL=debug

# Enable additional logging
DEBUG=mcp:*
SF_LOG_LEVEL=debug
```

## Authentication Setup

### Interactive Setup

```bash
# Run the authentication setup script
./docker/scripts.sh setup-auth

# This will:
# 1. Prompt for org alias and login URL
# 2. Start a temporary container
# 3. Open browser for OAuth flow
# 4. Store credentials in Docker volumes
```

### Manual Authentication

```bash
# Start temporary container
docker run -it --rm \
  -v salesforce_auth_data:/home/mcpuser/.sfdx \
  -v salesforce_config_data:/home/mcpuser/.config/sf \
  salesforce-mcp:latest \
  bash

# Inside container, authenticate
sf org login web --alias myorg
sf org list  # Verify authentication
exit
```

### Backup and Restore

```bash
# Export authentication data
./docker/scripts.sh export-auth
# Creates: ./auth-backup-YYYYMMDD-HHMMSS/

# Import authentication data
./docker/scripts.sh import-auth ./auth-backup-20240804-143000/
```

## Network Configuration

### Default Network

```yaml
networks:
  mcp-network:
    name: mcp-network
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Custom Network Setup

```bash
# Create custom network
docker network create \
  --driver bridge \
  --subnet=172.21.0.0/16 \
  --ip-range=172.21.240.0/20 \
  mcp-custom-network

# Use in docker-compose.override.yml
version: '3.8'
services:
  salesforce-mcp:
    networks:
      - mcp-custom-network

networks:
  mcp-custom-network:
    external: true
```

## Security Configuration

### User Security

```dockerfile
# Non-root user setup
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S mcpuser -u 1001 -G mcpuser

# File permissions
RUN chown -R mcpuser:mcpuser /app && \
    chmod 755 /app/build/index.js

USER mcpuser
```

### Volume Security

```yaml
# Read-only mounts for project files
volumes:
  - ./force-app:/app/force-app:ro
  - ./config:/app/config:ro
  - ./data:/app/data:ro
  
# Writable mounts for logs and auth
  - ./logs:/app/logs
  - salesforce_auth:/home/mcpuser/.sfdx
```

### Network Security

```yaml
# Restrict container communication
services:
  salesforce-mcp:
    networks:
      - mcp-network
    # No external network access by default
    
  # HTTP mode with controlled exposure
  salesforce-mcp-http:
    ports:
      - "127.0.0.1:3000:3000"  # Bind to localhost only
```

## Monitoring and Logging

### Health Checks

```dockerfile
# Container health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('MCP Server Health Check: OK')" || exit 1
```

```bash
# Check container health
docker ps  # Shows health status
docker inspect salesforce-mcp-server | grep Health
```

### Logging Configuration

```yaml
# Docker Compose logging
services:
  salesforce-mcp:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

```bash
# View logs
docker-compose logs -f salesforce-mcp
docker-compose logs -f --tail=100 salesforce-mcp-http

# Export logs
docker-compose logs salesforce-mcp > mcp-server.log
```

### Metrics and Monitoring

```bash
# Container resource usage
docker stats salesforce-mcp-server

# HTTP mode metrics
curl http://localhost:3000/api/status
{
  "service": "Salesforce CLI MCP Server",
  "version": "1.0.0",
  "mode": "http",
  "uptime": 3600,
  "memory": {
    "rss": 52428800,
    "heapTotal": 29360128,
    "heapUsed": 20971520
  },
  "environment": "production"
}
```

## Performance Optimization

### Image Optimization

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
# Build stage

FROM node:18-alpine AS production
# Production stage with minimal dependencies
```

### Volume Optimization

```yaml
# Use tmpfs for temporary data
services:
  salesforce-mcp:
    tmpfs:
      - /tmp
      - /app/temp
```

### Resource Limits

```yaml
services:
  salesforce-mcp:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## Troubleshooting

### Common Issues

#### 1. Authentication Problems

```bash
# Check auth volumes
docker volume inspect salesforce_auth_data

# Verify auth files
docker run --rm -v salesforce_auth_data:/data alpine ls -la /data

# Re-authenticate
./docker/scripts.sh setup-auth
```

#### 2. Permission Errors

```bash
# Check file ownership
docker run --rm -v salesforce_auth_data:/data alpine ls -la /data

# Fix permissions
docker run --rm -v salesforce_auth_data:/data alpine chown -R 1001:1001 /data
```

#### 3. Network Issues

```bash
# Check network connectivity
docker network ls
docker network inspect mcp-network

# Test HTTP mode
curl -f http://localhost:3000/health
```

#### 4. Build Failures

```bash
# Clean build
docker system prune -f
docker build --no-cache -t salesforce-mcp:latest .

# Check build logs
docker build -t salesforce-mcp:latest . 2>&1 | tee build.log
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=mcp:*
export MCP_LOG_LEVEL=debug

# Run with debug
docker-compose up salesforce-mcp
```

### Container Inspection

```bash
# Enter running container
docker exec -it salesforce-mcp-server bash

# Check Salesforce CLI
sf --version
sf org list

# Check MCP server
ps aux | grep node
netstat -tlnp
```

## Advanced Configuration

### Custom Dockerfiles

```dockerfile
# Dockerfile.custom
FROM salesforce-mcp:latest

# Add custom tools
RUN apk add --no-cache \
    jq \
    curl \
    vim

# Custom scripts
COPY custom-scripts/ /app/scripts/
RUN chmod +x /app/scripts/*

# Override entrypoint
COPY custom-entrypoint.sh /app/
ENTRYPOINT ["/app/custom-entrypoint.sh"]
```

### Docker Compose Override

```yaml
# docker-compose.override.yml
version: '3.8'

services:
  salesforce-mcp:
    environment:
      - CUSTOM_ENV_VAR=value
    volumes:
      - ./custom-config:/app/custom-config:ro
    ports:
      - "3002:3000"  # Custom port mapping
```

### Production Deployment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  salesforce-mcp:
    restart: unless-stopped
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('Health check')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Integration Examples

### CI/CD Pipeline

```yaml
# .github/workflows/docker.yml
name: Docker Build and Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker image
      run: docker build -t salesforce-mcp:test .
    
    - name: Test Docker image
      run: |
        docker run --rm salesforce-mcp:test node -e "console.log('Test passed')"
    
    - name: Push to registry
      if: github.ref == 'refs/heads/main'
      run: |
        echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker tag salesforce-mcp:test ${{ secrets.DOCKER_USERNAME }}/salesforce-mcp:latest
        docker push ${{ secrets.DOCKER_USERNAME }}/salesforce-mcp:latest
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: salesforce-mcp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: salesforce-mcp
  template:
    metadata:
      labels:
        app: salesforce-mcp
    spec:
      containers:
      - name: salesforce-mcp
        image: salesforce-mcp:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        volumeMounts:
        - name: auth-data
          mountPath: /home/mcpuser/.sfdx
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"
      volumes:
      - name: auth-data
        persistentVolumeClaim:
          claimName: salesforce-auth-pvc
```

## Best Practices

### Security

1. **Use non-root users** in all containers
2. **Mount volumes as read-only** when possible
3. **Limit network exposure** - bind to localhost only
4. **Regular security updates** - rebuild images monthly
5. **Scan images** for vulnerabilities

### Performance

1. **Use multi-stage builds** to minimize image size
2. **Leverage Docker layer caching** in CI/CD
3. **Set appropriate resource limits**
4. **Use tmpfs** for temporary data
5. **Monitor resource usage** regularly

### Reliability

1. **Implement health checks** for all services
2. **Use restart policies** for production
3. **Backup authentication data** regularly
4. **Test disaster recovery** procedures
5. **Monitor logs** and set up alerts

### Development

1. **Use development mode** for active development
2. **Volume mount source code** for hot reload
3. **Enable debug logging** during development
4. **Use MCP Inspector** for testing
5. **Document custom configurations**

---

**This completes the comprehensive Docker setup guide. For additional help, refer to the main README.md or open an issue on GitHub.**