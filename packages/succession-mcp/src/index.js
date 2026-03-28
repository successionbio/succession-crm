#!/usr/bin/env node

// Succession MCP Server
// The unified MCP for life science sales & marketing.
// Auto-discovers tool modules from ./tools/ directory.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readdir } from "fs/promises";
import { pathToFileURL } from "url";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

class SuccessionMCP {
  constructor() {
    this.server = new Server(
      { name: "succession", version: "0.1.0" },
      { capabilities: { tools: {} } }
    );

    // Tool registry — populated by auto-discovery
    this.tools = [];
    this.handlers = new Map(); // prefix → handler instance
  }

  async init() {
    // Load config from environment
    const config = {
      crm: {
        apiKey: process.env.TWENTY_API_KEY,
        baseUrl: process.env.TWENTY_BASE_URL || "https://crm.succession.bio",
      },
      database: {
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY,
      },
      enrichment: {
        enrichmentWorkerUrl: process.env.ENRICHMENT_WORKER_URL || "https://twenty-sync.successionbio.workers.dev",
        enrichmentApiKey: process.env.ENRICHMENT_API_KEY,
      },
      events: {
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY,
      },
      signals: {},
      messaging: {},
      campaigns: {},
      profile: {},
    };

    // Auto-discover tool modules from ./tools/
    await this.discoverTools(config);

    // Wire up MCP handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.tools,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        const result = await this.routeTool(name, args);
        return {
          content: [
            {
              type: "text",
              text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    });

    console.error(`Succession MCP loaded — ${this.tools.length} tools across ${this.handlers.size} modules`);
  }

  async discoverTools(config) {
    const toolsDir = join(__dirname, "tools");
    const files = await readdir(toolsDir);

    for (const file of files.sort()) {
      if (!file.endsWith(".js")) continue;

      const moduleName = file.replace(".js", "");
      const modulePath = pathToFileURL(join(toolsDir, file)).href;

      try {
        const mod = await import(modulePath);

        // Convention: each module exports getXxxTools() and XxxHandler
        const getToolsFn = Object.values(mod).find(
          (v) => typeof v === "function" && v.name.startsWith("get") && v.name.endsWith("Tools")
        );
        const HandlerClass = Object.values(mod).find(
          (v) => typeof v === "function" && v.name.endsWith("Handler") && v.prototype?.handle
        );

        if (!getToolsFn || !HandlerClass) {
          console.error(`Skipping ${file} — missing getXxxTools() or XxxHandler class`);
          continue;
        }

        const tools = getToolsFn();
        const handler = new HandlerClass(config[moduleName] || {});

        // Register tools and map each tool name to its handler
        this.tools.push(...tools);
        for (const tool of tools) {
          this.handlers.set(tool.name, handler);
        }

        const configuredStatus = handler.configured !== false ? "ready" : "not configured";
        console.error(`  ${moduleName}: ${tools.length} tools (${configuredStatus})`);
      } catch (err) {
        console.error(`Failed to load ${file}: ${err.message}`);
      }
    }
  }

  async routeTool(name, args) {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}. Available: ${[...this.handlers.keys()].join(", ")}`);
    }
    return handler.handle(name, args || {});
  }

  async run() {
    await this.init();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Succession MCP running on stdio");
  }
}

const server = new SuccessionMCP();
server.run().catch(console.error);
