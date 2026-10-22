#!/usr/bin/env node

/**
 * CapCut MCP Server
 *
 * A Model Context Protocol server for CapCut Pro video editing automation.
 * Provides tools for creating and editing video projects programmatically.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { type Request, type Response, type NextFunction } from 'express';
import { registerTools } from './tools/index.js';

const SERVER_INFO = { name: 'capcut-mcp-server', version: '1.0.0' };

function buildServer(): McpServer {
  const server = new McpServer(SERVER_INFO);
  registerTools(server);
  return server;
}

async function runStdio(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('CapCut MCP server running on stdio');
}

// Parse an allow-list of origins from env; empty means "same-origin only"
// (reject any request that carries an Origin header the server didn't send).
function parseAllowedOrigins(): Set<string> {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return new Set();
  return new Set(raw.split(',').map(s => s.trim()).filter(Boolean));
}

async function runHTTP(): Promise<void> {
  const app = express();

  // Cap body size — express.json() is unbounded by default.
  app.use(express.json({ limit: '1mb' }));

  // Guard against DNS rebinding: reject browser-origin requests unless they
  // come from an explicitly allow-listed origin. Non-browser clients (no
  // Origin header) are allowed.
  const allowedOrigins = parseAllowedOrigins();
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.header('origin');
    if (origin && !allowedOrigins.has(origin)) {
      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', server: SERVER_INFO.name, version: SERVER_INFO.version });
  });

  // Stateless MCP: fresh McpServer + transport per request. The SDK forbids
  // reconnecting a single McpServer instance, so each POST gets its own.
  app.post('/mcp', async (req, res) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    res.on('close', () => {
      transport.close().catch(() => { /* already closed */ });
      server.close().catch(() => { /* already closed */ });
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP request error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  // Bind to loopback only unless explicitly overridden (per MCP security guidance).
  const host = process.env.HOST ?? '127.0.0.1';
  app.listen(port, host, () => {
    console.error(`CapCut MCP server running on http://${host}:${port}/mcp`);
  });
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
CapCut MCP Server - Video Editing Automation

USAGE:
  capcut-mcp-server [OPTIONS]

OPTIONS:
  --help, -h          Show this help message
  --version, -v       Show version information

ENVIRONMENT VARIABLES:
  TRANSPORT           Transport type: 'stdio' (default) or 'http'
  HOST                HTTP bind address (default: 127.0.0.1)
  PORT                HTTP server port (default: 3000)
  ALLOWED_ORIGINS     Comma-separated list of allowed browser origins (default: none)
  CAPCUT_API_URL      CapCut API base URL (default: http://localhost:9001)

EXAMPLES:
  # Run with stdio (for local integration)
  capcut-mcp-server

  # Run with HTTP server (loopback only)
  TRANSPORT=http PORT=3000 capcut-mcp-server
`);
  process.exit(0);
}

if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log(`${SERVER_INFO.name} v${SERVER_INFO.version}`);
  process.exit(0);
}

const transport = process.env.TRANSPORT || 'stdio';

if (transport === 'http') {
  runHTTP().catch(error => {
    console.error('Server error:', error);
    process.exit(1);
  });
} else {
  runStdio().catch(error => {
    console.error('Server error:', error);
    process.exit(1);
  });
}
