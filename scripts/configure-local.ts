import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const payload = {
  mcpServers: {
    receiptcal: {
      command: "node",
      args: [resolve(root, "dist", "src", "stdio.js")],
    },
  },
};
await writeFile(resolve(root, ".mcp.local.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote optional local-development MCP entry for ${root}`);
