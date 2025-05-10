import z from "zod";

import { server } from "../server";
import { executeExtendScript } from "../extend-utils/utils";

server.tool(
  "open_document",
  "ドキュメントを開く",
  {
    path: z.string().describe("開くドキュメントの絶対パス"),
  },
  async ({ path }) => {
    const script = `
const file = new File("${path}");
var doc = app.open(file);
`;
    executeExtendScript(script, []);
    return {
      content: [{ type: "text", text: "ドキュメントを開きました．" }],
    };
  }
);
