import { z } from "zod";

import {
  getDocumentScript,
  createUUIDScript,
  executeExtendScript,
  getPageItemScript,
  toPt,
  ptToMmDefinition,
} from "../extend-utils/utils";
import { server } from "../server";
import { jsonDefinition } from "../extend-utils/json";

// Rectangle
const createRectsSchema = z.array(
  z.object({
    position: z
      .array(z.string())
      .describe(
        "x and y coordinates. Origin is at top left. Specify in mm or Q."
      ),
    size: z.array(z.string()).describe("Width and height. Specify in mm or Q."),
  })
);

server.tool(
  "create_rects",
  "Place multiple paths representing rectangles in the document",
  { rects: createRectsSchema },
  async ({ rects }) => {
    let script = [
      `
var doc = ${getDocumentScript};
var result = [];`,
    ];

    for (const rect of rects) {
      script.push(`
  (function () {
    var x = ${toPt(rect.position[0])};
    var y = ${-toPt(rect.position[1])};
    var width = ${toPt(rect.size[0])};
    var height = ${toPt(rect.size[1])};
    var rect = doc.pathItems.rectangle(y, x, width, height);
    rect.note = ${createUUIDScript};
    result.push({ uuid: rect.note });
  }());`);
    }
    script.push(`JSON.stringify(result);`);
    const output = executeExtendScript(script.join("\n"), [jsonDefinition]);
    return {
      content: [{ type: "text", text: `Created successfully.\n\n${output}` }],
    };
  }
);

// Line
const createLinesSchema = z.array(
  z.object({
    points: z
      .object({
        from: z.array(z.string()).length(2),
        to: z.array(z.string()).length(2),
      })
      .describe(
        "x and y coordinates of start and end points. Origin is at top left. Specify in mm or Q."
      ),
  })
);

server.tool(
  "create_lines",
  "Place multiple paths representing lines in the document.",
  { lines: createLinesSchema },
  async ({ lines }) => {
    let script = [
      `
var doc = ${getDocumentScript};
var result = [];`,
    ];

    for (const line of lines) {
      const fromX = toPt(line.points.from[0]);
      const fromY = -toPt(line.points.from[1]);
      const toX = toPt(line.points.to[0]);
      const toY = -toPt(line.points.to[1]);
      script.push(
        `
  (function () {
    var line = doc.pathItems.add();
    line.note = ${createUUIDScript};
    line.stroked = true;
    line.filled = false;
    line.setEntirePath([[${fromX}, ${fromY}], [${toX}, ${toY}]]);
    result.push({ uuid: line.note });
  }());`
      );
    }
    script.push(`JSON.stringify(result);`);
    const output = executeExtendScript(script.join("\n"), [jsonDefinition]);
    return {
      content: [{ type: "text", text: `Successfully created.\n\n${output}` }],
    };
  }
);

// Common
server.tool(
  "list_pathitems",
  "Get information of existing paths",
  {},
  async () => {
    const script = `
var doc = ${getDocumentScript};
var result = [];
for (var i = 0; i < doc.pathItems.length; i++) {
  var item = doc.pathItems[i];
  if (!item.note) {
    item.note = ${createUUIDScript};
  }
  result.push({
    uuid: item.note,
    position: [ptToMm(item.left), ptToMm(-item.top)],
    size: [ptToMm(item.width), ptToMm(item.height)],
    selected: item.selected,
  });
}
JSON.stringify(result);
`;
    const output = executeExtendScript(script, [
      jsonDefinition,
      ptToMmDefinition,
    ]);
    return {
      content: [{ type: "text", text: `Retrieved successfully.\n\n${output}` }],
    };
  }
);

const multiplePathChangeSchema = z
  .array(
    z.object({
      uuid: z.string(),
      fillCmyk: z
        .array(z.string())
        .describe("Fill color. Specify values from 0 to 100."),
      strokeCmyk: z
        .array(z.string())
        .describe("Stroke color. Specify values from 0 to 100."),
      strokeWidth: z.string().describe("Stroke width. Specify in mm or Q."),
      position: z
        .array(z.string())
        .optional()
        .describe(
          "x and y coordinates. Origin is at top left. Specify in mm or Q."
        ),
      size: z
        .array(z.string())
        .optional()
        .describe("Width and height. Specify in mm or Q."),
    })
  )
  .describe("Array of UUIDs and attributes of paths to change");

server.tool(
  "change_pathitems",
  "Change attributes of multiple paths.",
  {
    changes: multiplePathChangeSchema,
  },
  async ({ changes }) => {
    let lines: string[] = [];
    for (const change of changes) {
      lines.push("(function () {");
      lines.push(`var item = ${getPageItemScript(change.uuid)};`);

      // Fill
      if (change.fillCmyk) {
        lines.push(
          `var cmyk = new CMYKColor();
  cmyk.cyan = ${change.fillCmyk[0]};
  cmyk.magenta = ${change.fillCmyk[1]};
  cmyk.yellow = ${change.fillCmyk[2]};
  cmyk.black = ${change.fillCmyk[3]};
  item.filled = true;
  item.fillColor = cmyk;`
        );
      }

      // Stroke
      if (change.strokeCmyk) {
        lines.push(
          `var cmyk = new CMYKColor();
  cmyk.cyan = ${change.strokeCmyk[0]};
  cmyk.magenta = ${change.strokeCmyk[1]};
  cmyk.yellow = ${change.strokeCmyk[2]};
  cmyk.black = ${change.strokeCmyk[3]};
  item.stroked = true;
  item.strokeColor = cmyk;`
        );
      }
      if (change.strokeWidth) {
        lines.push(`item.strokeWidth = ${toPt(change.strokeWidth)};`);
      }

      // Position and size
      if (change.position) {
        const x = toPt(change.position[0]);
        const y = -toPt(change.position[1]);
        lines.push(`item.position = [${x}, ${y}];`);
      }
      if (change.size) {
        const width = toPt(change.size[0]);
        const height = toPt(change.size[1]);
        lines.push(`item.size = [${width}, ${height}];`);
      }

      lines.push("}());");
    }
    executeExtendScript(lines.join("\n"), []);
    return {
      content: [{ type: "text", text: "Changed successfully." }],
    };
  }
);
