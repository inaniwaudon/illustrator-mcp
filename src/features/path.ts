import { z } from "zod";

import { executeExtendScript } from "../extend-utils/utils";
import { server } from "../server";

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
  "Places multiple paths representing rectangles in the document.",
  { rects: createRectsSchema },
  async ({ rects }) => {
    let script = `
var doc = getDocument();
var inputs = ${JSON.stringify(rects)};
var result = [];

for (var i = 0; i < inputs.length; i++) {
  var x = toPt(inputs[i].position[0]);
  var y = -toPt(inputs[i].position[1]);
  var width = toPt(inputs[i].size[0]);
  var height = toPt(inputs[i].size[1]);
  var rect = doc.pathItems.rectangle(y, x, width, height);
  rect.note = createUUID();
  result.push({ uuid: rect.note });
}
JSON.stringify(result);`;
    const output = executeExtendScript(script);
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
  "Places multiple paths representing lines in the document.",
  { lines: createLinesSchema },
  async ({ lines }) => {
    let script = `
var doc = getDocument();
var inputs = ${JSON.stringify(lines)};
var result = [];

for (var i = 0; i < inputs.length; i++) {
  var fromX = toPt(inputs[i].points.from[0]);
  var fromY = -toPt(inputs[i].points.from[1]);
  var toX = toPt(inputs[i].points.to[0]);
  var toY = -toPt(inputs[i].points.to[1]);

  var line = doc.pathItems.add();
  line.note = createUUID();
  line.stroked = true;
  line.filled = false;
  line.setEntirePath([[fromX, fromY], [toX, toY]]);
  result.push({ uuid: line.note });
}
JSON.stringify(result);
`;
    const output = executeExtendScript(script);
    return {
      content: [{ type: "text", text: `Successfully created.\n\n${output}` }],
    };
  }
);

// Common
server.tool(
  "list_pathitems",
  "Gets information of existing paths.",
  {},
  async () => {
    const script = `
var doc = getDocument();
var result = [];
for (var i = 0; i < doc.pathItems.length; i++) {
  var item = doc.pathItems[i];
  if (!item.note) {
    item.note = createUUID();
  }
  result.push({
    uuid: item.note,
    name: item.name,
    position: [ptToMm(item.left), ptToMm(-item.top)],
    size: [ptToMm(item.width), ptToMm(item.height)],
    selected: item.selected,
  });
}
JSON.stringify(result);
`;
    const output = executeExtendScript(script);
    return {
      content: [{ type: "text", text: `Retrieved successfully.\n\n${output}` }],
    };
  }
);

const changePathsSchema = z
  .array(
    z.object({
      uuid: z.string(),
      fillCmyk: z
        .array(z.string())
        .optional()
        .describe("Fill color. Specify values from 0 to 100."),
      strokeCmyk: z
        .array(z.string())
        .optional()
        .describe("Stroke color. Specify values from 0 to 100."),
      strokeWidth: z
        .string()
        .optional()
        .describe("Stroke width with units. Specify in mm or Q."),
      position: z
        .array(z.string())
        .optional()
        .describe(
          "x and y coordinates with units. Origin is at top left. Specify in mm or Q."
        ),
      size: z
        .array(z.string())
        .optional()
        .describe("Width and height with units. Specify in mm or Q."),
    })
  )
  .describe("Array of UUIDs and attributes of paths to change");

server.tool(
  "change_pathitems",
  "Changes attributes of multiple paths.",
  {
    changes: changePathsSchema,
  },
  async ({ changes }) => {
    const script = `
var inputs = ${JSON.stringify(changes)};

for (var i = 0; i < inputs.length; i++) {
  var item = getPageItem(inputs[i].uuid);
  if (inputs[i].fillCmyk) {
    var cmyk = new CMYKColor();
    cmyk.cyan = inputs[i].fillCmyk[0];
    cmyk.magenta = inputs[i].fillCmyk[1];
    cmyk.yellow = inputs[i].fillCmyk[2];
    cmyk.black = inputs[i].fillCmyk[3];
    item.filled = true;
    item.fillColor = cmyk;
  }
  if (inputs[i].strokeCmyk) {
    var cmyk = new CMYKColor();
    cmyk.cyan = inputs[i].strokeCmyk[0];
    cmyk.magenta = inputs[i].strokeCmyk[1];
    cmyk.yellow = inputs[i].strokeCmyk[2];
    cmyk.black = inputs[i].strokeCmyk[3];
    item.stroked = true;
    item.strokeColor = cmyk;
  }
  if (inputs[i].strokeWidth !== undefined) {
    item.strokeWidth = toPt(inputs[i].strokeWidth);
  }
  if (inputs[i].size) {
    var targetWidth = toPt(inputs[i].size[0]);
    var targetHeight = toPt(inputs[i].size[1]);
    var originalWidth = item.width;
    var originalHeight = item.height;
    var scaleX = (targetWidth / originalWidth) * 100;
    var scaleY = (targetHeight / originalHeight) * 100;
    var scaleMatrix = app.getScaleMatrix(scaleX, scaleY);
    item.transform(scaleMatrix, true, true, true, true, 1, Transformation.CENTER);
  }
  if (inputs[i].position) {
    var x = toPt(inputs[i].position[0]);
    var y = -toPt(inputs[i].position[1]);
    item.position = [x, y];
  }
}
`;
    executeExtendScript(script);
    return {
      content: [{ type: "text", text: "Changed successfully." }],
    };
  }
);
