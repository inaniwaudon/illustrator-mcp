import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./server";

import "./features/document";
import "./features/image";
import "./features/item";
import "./features/path";
import "./features/text";
import "./features/utils";

export { server };

(async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP Server launched");
})();
