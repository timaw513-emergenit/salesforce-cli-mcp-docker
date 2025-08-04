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
│  │ • MCP Protocol  │  │ • SSE Transport │  │ • Live Updates │
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

# Follow the prompts:
# 1. Enter org alias (e.g., 'mydevhub')
# 2. Enter login URL (default: https://login.salesforce.com)
# 3. Complete browser authentication
# 4. Verify org list
```

### Manual Authentication

```bash
# Start a temporary container for auth
docker run -it --rm \
  -v salesforce_auth_data:/home/mcpuser/.sfdx \
  -v salesforce_config_data:/home/mcpuser/.config/sf \
  salesforce-mcp:latest \
  bash

# Inside the container:
sf org login web --alias myorg
sf org list
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

## Security Configuration

### User Security

```dockerfile
# Non-root user setup
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S mcpuser -u 1001 -G mcpuser

# Switch to non-root user
USER mcpuser
```

### Network Security

```yaml
networks:
  mcp-network:
    name: mcp-network
    driver: bridge
    # Isolated network for MCP services
```

### Volume Security

```yaml
volumes:
  salesforce_auth:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /secure/path/auth
```

## Health Monitoring

### Health Checks

```dockerfile
# Production health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('MCP Server Health Check: OK')" || exit 1

# HTTP mode health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
```

### Logging Configuration

```yaml
services:
  salesforce-mcp:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Performance Optimization

### Resource Limits

```yaml
services:
  salesforce-mcp:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Build Optimization

```dockerfile
# Multi-stage build for smaller images
FROM node:18-alpine AS builder
# Build stage...

FROM node:18-alpine AS production
# Production stage with minimal footprint
```

## Troubleshooting

### Common Issues

#### 1. Authentication Problems

```bash
# Check volume contents
docker run --rm -v salesforce_auth_data:/data alpine ls -la /data

# Reset authentication
docker volume rm salesforce_auth_data salesforce_config_data
./docker/scripts.sh setup-auth
```

#### 2. Permission Issues

```bash
# Fix volume permissions
docker run --rm -v salesforce_auth_data:/data alpine chown -R 1001:1001 /data
docker run --rm -v salesforce_config_data:/data alpine chown -R 1001:1001 /data
```

#### 3. Network Connectivity

```bash
# Test network connectivity
docker run --rm --network mcp-network alpine ping salesforce-mcp-http

# Check port binding
docker port salesforce-mcp-http-server
```

#### 4. Container Won't Start

```bash
# Check logs
docker-compose logs salesforce-mcp

# Debug mode
docker run -it --rm salesforce-mcp:latest sh
```

### Debug Commands

```bash
# Container inspection
docker inspect salesforce-mcp-server

# Resource usage
docker stats salesforce-mcp-server

# Exec into running container
docker exec -it salesforce-mcp-server sh

# View live logs
docker-compose logs -f --tail=100 salesforce-mcp
```

## Production Deployment

### Docker Swarm

```yaml
version: '3.8'

services:
  salesforce-mcp:
    image: salesforce-mcp:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    networks:
      - mcp-network
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: salesforce-mcp
spec:
  replicas: 3
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
        volumeMounts:
        - name: auth-volume
          mountPath: /home/mcpuser/.sfdx
        - name: config-volume
          mountPath: /home/mcpuser/.config/sf
      volumes:
      - name: auth-volume
        persistentVolumeClaim:
          claimName: salesforce-auth-pvc
      - name: config-volume
        persistentVolumeClaim:
          claimName: salesforce-config-pvc
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker images
      run: |
        docker build -t salesforce-mcp:${{ github.sha }} .
        docker build -t salesforce-mcp:http-${{ github.sha }} -f Dockerfile.http .
    
    - name: Test containers
      run: |
        docker run --rm salesforce-mcp:${{ github.sha }} node -e "console.log('Test passed')"
    
    - name: Push to registry
      run: |
        docker tag salesforce-mcp:${{ github.sha }} registry.com/salesforce-mcp:latest
        docker push registry.com/salesforce-mcp:latest
```

## Best Practices

### 1. Security
- Always run containers as non-root user
- Use multi-stage builds to minimize attack surface
- Regularly update base images
- Scan images for vulnerabilities

### 2. Performance
- Set appropriate resource limits
- Use volume mounts for persistent data
- Optimize Docker layer caching
- Monitor container metrics

### 3. Reliability
- Implement proper health checks
- Use restart policies
- Configure logging rotation
- Plan for graceful shutdowns

### 4. Maintenance
- Regular image updates
- Backup authentication data
- Monitor logs for errors
- Test disaster recovery procedures

---

**Next Steps**: Continue with the [main README](README.md) for usage examples and API documentation.