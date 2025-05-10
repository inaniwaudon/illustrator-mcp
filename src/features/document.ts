import z from "zod";

import { server } from "../server";
import { executeExtendScript } from "../extend-utils/utils";

server.tool(
  "open_document",
  "Open a document",
  {
    path: z.string().describe("Absolute path of the document to open"),
  },
  async ({ path }) => {
    const script = `
const file = new File("${path}");
var doc = app.open(file);
`;
    executeExtendScript(script, []);
    return {
      content: [{ type: "text", text: "Document opened." }],
    };
  }
);
