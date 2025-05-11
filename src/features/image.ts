import z from "zod";

import { server } from "../server";
import { executeExtendScript } from "../extend-utils/utils";

server.tool(
  "create_images",
  "Places multiple images in the document.",
  { paths: z.array(z.string()).describe("Image paths") },
  async ({ paths }) => {
    const script = `
var doc = getDocument();
var paths = ${JSON.stringify(paths)};
var result = [];
for (var i = 0; i < paths.length; i++) {
  var image = doc.placedItems.add();
  image.file = new File(paths[i]);
  image.note = createUUID();
  result.push({ uuid: image.note });
}
JSON.stringify(result);
`;
    const output = executeExtendScript(script);
    return {
      content: [
        {
          type: "text",
          text: `Placed successfully.\n\n${output}`,
        },
      ],
    };
  }
);

server.tool(
  "list_images",
  "Gets information of existing images.",
  {},
  async () => {
    const script = `
var doc = getDocument();
var result = [];
for (var i = 0; i < doc.placedItems.length; i++) {
  var item = doc.placedItems[i];
  if (!item.note) {
    item.note = createUUID();
  }
  result.push({
    uuid: item.note,
    path: item.file.name,
    x: ptToMm(item.left),
    y: ptToMm(-item.top),
    width: ptToMm(item.width),
    height: ptToMm(item.height),
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

const multipleImageChangeSchema = z
  .array(
    z.object({
      uuid: z.string().describe("UUID"),
      path: z.string().describe("Image path"),
      x: z
        .string()
        .optional()
        .describe("X coordinate (origin at top left, specify in mm or Q)"),
      y: z
        .string()
        .optional()
        .describe("Y coordinate (origin at top left, specify in mm or Q)"),
      width: z.string().optional().describe("Width (specify in mm or Q)"),
      height: z.string().optional().describe("Height (specify in mm or Q)"),
      maintainAspectRatio: z
        .boolean()
        .optional()
        .describe("Whether to maintain aspect ratio"),
    })
  )
  .describe("Array of UUIDs and attributes of images to change");

server.tool(
  "change_images",
  "Changes attributes of multiple images.",
  {
    changes: multipleImageChangeSchema,
  },
  async ({ changes }) => {
    const script = `
var inputs = ${JSON.stringify(changes)};

for (var i = 0; i < inputs.length; i++) {
  var item = getPageItem(inputs[i].uuid);
  if (inputs[i].file) {
    item.file = new File(inputs[i].file);
  }
  if (inputs[i].x) {
    item.left = toPt(inputs[i].x);
  }
  if (inputs[i].y) {
    item.top = -toPt(inputs[i].y);
  }
  if (inputs[i].width) {
    var afterWidth = toPt(inputs[i].width);
    if (inputs[i].maintainAspectRatio) {
      item.height = afterWidth * (item.height / item.width);
    }
    item.width = afterWidth;
  }
  if (inputs[i].height) {
    var afterHeight = toPt(inputs[i].height);
    if (inputs[i].maintainAspectRatio) {
      item.width = afterHeight * (item.width / item.height);
    }
    item.height = afterHeight;
  }
}
`;
    executeExtendScript(script);
    return {
      content: [{ type: "text", text: "Changed successfully." }],
    };
  }
);
