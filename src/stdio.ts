#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createReceiptCalServer } from "./server.js";

const server = createReceiptCalServer();
const transport = new StdioServerTransport();
await server.connect(transport);

async function shutdown(): Promise<void> {
  await transport.close();
  await server.close();
}

process.on("SIGINT", () => { void shutdown().finally(() => process.exit(0)); });
process.on("SIGTERM", () => { void shutdown().finally(() => process.exit(0)); });
