import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const server = new McpServer({
  name: "illustrator-mcp",
  version: "1.0.0",
  description: "Performs operations on Illustrator documents.",
});
