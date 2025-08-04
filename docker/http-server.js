#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import express from "express";
import cors from "cors";

const execAsync = promisify(exec);
const app = express();
const port = process.env.MCP_PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Import the same schemas and functions from the main server
const OrgListArgsSchema = z.object({
  all: z.boolean().optional().describe("Show all orgs, including expired and deleted ones"),
  clean: z.boolean().optional().describe("Remove all local org authorization files for non-active orgs"),
  skipConnectionStatus: z.boolean().optional().describe("Skip retrieving the connection status of each org")
});

const QueryArgsSchema = z.object({
  query: z.string().describe("SOQL query to execute"),
  targetOrg: z.string().optional().describe("Username or alias of the target org"),
  useToolingApi: z.boolean().optional().describe("Use Tooling API instead of standard API"),
  bulk: z.boolean().optional().describe("Use Bulk API 2.0 for large queries")
});

/**
 * Executes a Salesforce CLI command and returns the result
 */
async function executeSfCommand(command) {
  try {
    console.log(`[${new Date().toISOString()}] Executing: ${command}`);
    const result = await execAsync(command, { 
      timeout: 300000, // 5 minute timeout
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    return result;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Command failed: ${error.message}`);
    throw new Error(`Salesforce CLI command failed: ${error.message}`);
  }
}

/**
 * Builds command flags from arguments
 */
function buildFlags(args) {
  const flags = [];
  
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null) continue;
    
    const flagName = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    
    if (typeof value === 'boolean') {
      if (value) flags.push(`--${flagName}`);
    } else if (Array.isArray(value)) {
      flags.push(`--${flagName}`, value.join(','));
    } else {
      flags.push(`--${flagName}`, String(value));
    }
  }
  
  return flags.join(' ');
}

/**
 * Main server setup for HTTP mode
 */
const server = new Server(
  {
    name: "salesforce-cli-mcp-server-http",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools (same as stdio version)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "sf_org_list",
        description: "List all authorized Salesforce orgs",
        inputSchema: {
          type: "object",
          properties: {
            all: { type: "boolean", description: "Show all orgs, including expired and deleted ones" },
            clean: { type: "boolean", description: "Remove all local org authorization files for non-active orgs" },
            skipConnectionStatus: { type: "boolean", description: "Skip retrieving the connection status of each org" }
          }
        }
      },
      {
        name: "sf_data_query",
        description: "Execute a SOQL query against a Salesforce org",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "SOQL query to execute" },
            targetOrg: { type: "string", description: "Username or alias of the target org" },
            useToolingApi: { type: "boolean", description: "Use Tooling API instead of standard API" },
            bulk: { type: "boolean", description: "Use Bulk API 2.0 for large queries" }
          },
          required: ["query"]
        }
      },
      {
        name: "sf_custom_command",
        description: "Execute a custom Salesforce CLI command",
        inputSchema: {
          type: "object",
          properties: {
            command: { type: "string", description: "Full Salesforce CLI command to execute (without 'sf' prefix)" }
          },
          required: ["command"]
        }
      }
    ],
  };
});

// Handle tool calls (same logic as stdio version)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let command;
    let result;

    switch (name) {
      case "sf_org_list": {
        const validatedArgs = OrgListArgsSchema.parse(args || {});
        const flags = buildFlags(validatedArgs);
        command = `sf org list --json ${flags}`.trim();
        result = await executeSfCommand(command);
        break;
      }

      case "sf_data_query": {
        const validatedArgs = QueryArgsSchema.parse(args);
        const flags = buildFlags(validatedArgs);
        command = `sf data query --json ${flags}`.trim();
        result = await executeSfCommand(command);
        break;
      }

      case "sf_custom_command": {
        const customArgs = z.object({ command: z.string() }).parse(args);
        command = `sf ${customArgs.command}`;
        result = await executeSfCommand(command);
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // Try to parse JSON output first, fall back to plain text
    let content;
    try {
      content = JSON.parse(result.stdout);
    } catch {
      content = result.stdout || result.stderr;
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(content, null, 2),
        },
      ],
    };

  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'salesforce-cli-mcp-server'
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    service: 'Salesforce CLI MCP Server',
    version: '1.0.0',
    mode: 'http',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});

// Start HTTP server with SSE transport
async function main() {
  try {
    // Setup SSE transport
    const transport = new SSEServerTransport("/message", res => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
    });

    // Connect MCP server to transport
    await server.connect(transport);
    
    // Add MCP routes to Express app
    app.use('/mcp', transport.expressRouter);

    // Start the HTTP server
    app.listen(port, () => {
      console.log(`🚀 Salesforce CLI MCP Server (HTTP mode) running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`📈 Status: http://localhost:${port}/api/status`);
      console.log(`🔗 MCP endpoint: http://localhost:${port}/mcp`);
    });

  } catch (error) {
    console.error("Failed to start HTTP server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});