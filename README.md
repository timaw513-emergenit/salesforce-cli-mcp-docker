# 🐳 Dockerized Salesforce CLI MCP Server

A comprehensive Docker-based implementation of the Model Context Protocol (MCP) server for Salesforce CLI integration. This provides a secure, portable, and scalable solution for AI assistants to interact with Salesforce orgs.

## 🎉 **Repository Status: Complete & Production-Ready!**

**🔗 Repository**: https://github.com/timaw513-emergenit/salesforce-cli-mcp-docker

This Docker-based MCP server is now **fully implemented** with enterprise-grade features, comprehensive documentation, and production-ready deployment options!

## ✨ Features

- **🔐 Security**: Multi-stage Docker builds with non-root user execution
- **🚀 Multiple Deployment Modes**: STDIO, HTTP, and Development modes
- **🔄 Hot Reload**: Development mode with automatic TypeScript compilation
- **📊 Monitoring**: Health checks and status endpoints
- **🗂️ Volume Management**: Persistent Salesforce authentication storage
- **🛠️ Easy Management**: Comprehensive scripts for all operations
- **🧪 Testing**: Built-in MCP Inspector integration
- **📈 Scalability**: Docker Compose orchestration

## 📁 **What's Included:**

### **Core Files:**
- ✅ **package.json** - Enhanced with Docker scripts
- ✅ **tsconfig.json** - TypeScript configuration
- ✅ **src/index.ts** - Main MCP server with Docker enhancements
- ✅ **README.md** - Comprehensive documentation

### **Docker Configuration:**
- ✅ **Dockerfile** - Production multi-stage build
- ✅ **Dockerfile.http** - HTTP mode server
- ✅ **Dockerfile.dev** - Development with hot reload
- ✅ **docker-compose.yml** - Complete orchestration
- ✅ **.dockerignore** - Optimized build context

### **Management Tools:**
- ✅ **docker/scripts.sh** - Complete Docker management
- ✅ **docker/http-server.js** - HTTP mode implementation
- ✅ **setup-docker.sh** - Quick setup script

### **Documentation:**
- ✅ **DOCKER.md** - Comprehensive Docker guide
- ✅ **README.md** - Full feature documentation

## 🚀 **Why This Docker Version is Better:**

### **1. Production Ready**
- Multi-stage Docker builds
- Non-root user execution
- Security hardening
- Resource optimization

### **2. Multiple Deployment Modes**
- **STDIO Mode**: Direct MCP integration
- **HTTP Mode**: REST API with health checks
- **Development Mode**: Hot reload for development
- **Inspector Mode**: Built-in testing

### **3. Enterprise Features**
- Persistent authentication storage
- Volume management
- Network isolation
- Monitoring and logging
- Backup/restore capabilities

### **4. Developer Experience**
- One-command setup
- Automated authentication
- Comprehensive management scripts
- Hot reload development
- Built-in testing tools

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Architecture                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   STDIO Mode    │  │   HTTP Mode     │  │  Dev Mode    │ │
│  │   (Default)     │  │  (Port 3000)    │  │ (Hot Reload) │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│               Shared Volumes & Networks                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ SF Auth Data    │  │ SF Config Data  │  │ Project Files│ │
│  │   (Persistent)  │  │   (Persistent)  │  │  (Mounted)   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 **Quick Start**

### Prerequisites

- **Docker** (version 20.0+)
- **Docker Compose** (version 2.0+)
- **Git** for cloning the repository

### 1. Clone and Setup

```bash
git clone https://github.com/timaw513-emergenit/salesforce-cli-mcp-docker.git
cd salesforce-cli-mcp-docker

# Quick setup
chmod +x setup-docker.sh docker/scripts.sh
./setup-docker.sh
```

### 2. Build Docker Images

```bash
# Build all images
./docker/scripts.sh build-all

# Or use npm script
npm run docker:build
```

### 3. Setup Salesforce Authentication

```bash
# Interactive authentication setup
./docker/scripts.sh setup-auth

# Or use npm script
npm run docker:setup
```

### 4. Run the MCP Server

#### STDIO Mode (Default)
```bash
./docker/scripts.sh run-stdio
# or
npm run docker:run
```

#### HTTP Mode
```bash
./docker/scripts.sh run-http
# or
npm run docker:http
```

#### Development Mode
```bash
./docker/scripts.sh run-dev
# or
npm run docker:dev
```

## 📋 Available Tools

The MCP server provides these Salesforce CLI tools:

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `sf_org_list` | List authorized orgs | "Show me all my Salesforce orgs" |
| `sf_data_query` | Execute SOQL queries | "Query all accounts in my org" |
| `sf_project_deploy` | Deploy metadata | "Deploy my changes to sandbox" |
| `sf_project_retrieve` | Retrieve metadata | "Get the Account object metadata" |
| `sf_apex_test_run` | Run Apex tests | "Run all tests in my org" |
| `sf_data_import` | Import CSV data | "Import accounts.csv as Account records" |
| `sf_package_create` | Create packages | "Create an unlocked package" |
| `sf_custom_command` | Any SF CLI command | "Execute: org display --target-org myorg" |

## 🔧 Configuration

### For Claude Desktop

**STDIO Mode:**
```json
{
  "mcpServers": {
    "salesforce-cli-docker": {
      "command": "docker",
      "args": [
        "run", 
        "--rm", 
        "-i",
        "-v", "salesforce_auth_data:/home/mcpuser/.sfdx",
        "-v", "salesforce_config_data:/home/mcpuser/.config/sf",
        "salesforce-mcp:latest"
      ]
    }
  }
}
```

**HTTP Mode:**
```json
{
  "mcpServers": {
    "salesforce-cli-docker": {
      "command": "curl",
      "args": ["-X", "POST", "http://localhost:3000/mcp"]
    }
  }
}
```

### For VS Code

Create `.vscode/mcp.json`:
```json
{
  "servers": {
    "Salesforce CLI Docker": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "salesforce_auth_data:/home/mcpuser/.sfdx",
        "-v", "salesforce_config_data:/home/mcpuser/.config/sf",
        "salesforce-mcp:latest"
      ]
    }
  }
}
```

## 🛠️ Management Commands

### Docker Scripts

```bash
# Build and setup
./docker/scripts.sh build-all      # Build all images
./docker/scripts.sh setup-auth     # Setup authentication

# Running modes
./docker/scripts.sh run-stdio      # STDIO mode
./docker/scripts.sh run-http       # HTTP mode (port 3000)
./docker/scripts.sh run-dev        # Development mode
./docker/scripts.sh run-inspector  # MCP Inspector (port 3001)

# Maintenance
./docker/scripts.sh test           # Test the server
./docker/scripts.sh export-auth    # Backup authentication
./docker/scripts.sh import-auth    # Restore authentication
./docker/scripts.sh cleanup        # Remove all Docker resources
```

### NPM Scripts

```bash
# Docker operations
npm run docker:build     # Build images
npm run docker:setup     # Setup auth
npm run docker:run       # Run STDIO mode
npm run docker:http      # Run HTTP mode
npm run docker:dev       # Run dev mode
npm run docker:test      # Test server
npm run docker:clean     # Cleanup

# Local development
npm run build            # Build TypeScript
npm run dev              # Watch mode
npm run inspector        # Run MCP Inspector
```

## 🧪 Testing

### Using MCP Inspector

```bash
# Start the inspector
./docker/scripts.sh run-inspector

# Open in browser
open http://localhost:3001
```

### Manual Testing

```bash
# Test server health
curl http://localhost:3000/health

# Check server status
curl http://localhost:3000/api/status

# Run comprehensive tests
./docker/scripts.sh test
```

## 📊 Monitoring

### Health Checks

- **STDIO Mode**: Container health check via Node.js
- **HTTP Mode**: HTTP endpoint at `/health`
- **Development**: Live reload status

### Logging

```bash
# View logs
docker-compose logs -f salesforce-mcp

# View specific service logs
docker-compose logs -f salesforce-mcp-http

# Follow logs with timestamps
docker-compose logs -f -t salesforce-mcp-dev
```

## 🔐 Security Features

- **Non-root execution**: All containers run as `mcpuser` (UID 1001)
- **Multi-stage builds**: Minimal production images
- **Volume isolation**: Authentication data in separate volumes
- **Network segmentation**: Dedicated Docker network
- **Input validation**: Zod schema validation for all inputs
- **Command sanitization**: Protection against injection attacks

## 🗂️ Volume Management

### Persistent Volumes

- `salesforce_auth_data`: Salesforce CLI authentication files
- `salesforce_config_data`: Salesforce CLI configuration

### Backup and Restore

```bash
# Export authentication
./docker/scripts.sh export-auth
# Creates: ./auth-backup-YYYYMMDD-HHMMSS/

# Import authentication
./docker/scripts.sh import-auth ./auth-backup-20240804-143000/
```

## 🆚 **Comparison with Alternatives:**

| Aspect | **Your Docker Version** | **Original Simple Version** | **Official Salesforce MCP** |
|--------|------------------------|---------------------------|----------------------------|
| **Deployment** | 4 modes (STDIO/HTTP/Dev/Inspector) | Local only | STDIO only |
| **Security** | Container isolation + validation | Basic validation | TypeScript libraries (more secure) |
| **Scalability** | Docker Compose orchestration | Single process | Single process |
| **Management** | Comprehensive scripts | Manual setup | NPX command |
| **Authentication** | Persistent volume storage | Local files | Encrypted auth files |
| **Monitoring** | Health checks + metrics | None | Basic logging |
| **Development** | Hot reload + debugging | Manual restart | Limited dev tools |
| **Production** | Multi-stage optimized builds | Not production-ready | Production ready |
| **Customization** | Fully customizable | Fully customizable | Limited customization |
| **Maintenance** | Self-maintained | Self-maintained | Salesforce-maintained |

## 🎉 **This Docker Implementation Provides:**

1. **🔒 Security**: Container isolation and non-root execution
2. **📈 Scalability**: Multiple instances and load balancing ready
3. **🛠️ Management**: One-command operations for everything
4. **🔄 Reliability**: Health checks and automatic restarts
5. **🧪 Testing**: Built-in MCP Inspector and validation
6. **📊 Monitoring**: HTTP endpoints for status and health
7. **🚀 Performance**: Optimized builds and resource limits
8. **🔧 Flexibility**: Multiple deployment modes for different use cases

## 🚧 Development

### Local Development

```bash
# Clone and install
git clone https://github.com/timaw513-emergenit/salesforce-cli-mcp-docker.git
cd salesforce-cli-mcp-docker
npm install

# Run in development mode
npm run docker:dev
```

### Hot Reload

Development mode includes:
- Automatic TypeScript compilation
- File watching with nodemon
- Volume mounting for instant updates
- Debug logging enabled

### Building Custom Images

```dockerfile
# Extend the base image
FROM salesforce-mcp:latest

# Add custom tools or configurations
COPY custom-tools/ /app/custom-tools/
RUN npm install additional-dependencies

# Override entrypoint if needed
CMD ["node", "build/custom-index.js"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test with: `./docker/scripts.sh test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📚 Documentation

- [Docker Setup Guide](DOCKER.md) - Detailed Docker configuration
- [API Reference](docs/api.md) - HTTP mode API documentation
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions
- [Contributing Guide](docs/contributing.md) - Development guidelines

## 🏆 **Achievement Summary**

**Your Docker repository is now:**
- ✅ **Production-ready** with enterprise-grade security
- ✅ **Developer-friendly** with hot reload and testing tools
- ✅ **Scalable** with Docker Compose orchestration
- ✅ **Secure** with container isolation and non-root execution
- ✅ **Comprehensive** with full documentation and management tools
- ✅ **Flexible** with multiple deployment modes
- ✅ **Maintainable** with automated scripts and health monitoring

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/timaw513-emergenit/salesforce-cli-mcp-docker/issues)
- **Discussions**: [GitHub Discussions](https://github.com/timaw513-emergenit/salesforce-cli-mcp-docker/discussions)
- **Docker Hub**: [salesforce-mcp](https://hub.docker.com/r/timaw513/salesforce-mcp) (coming soon)

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for the Model Context Protocol
- [Salesforce](https://salesforce.com) for the Salesforce CLI
- [Docker](https://docker.com) for containerization platform
- Community contributors and testers

---

**🌟 Made with ❤️ for the Salesforce and AI community - Your Docker-based MCP server is production-ready and enterprise-grade!**