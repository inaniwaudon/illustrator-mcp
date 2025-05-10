import { z } from "zod";

import { server } from "../server";
import {
  executeExtendScript,
  getDocumentScript,
  getPageItemDefinition,
} from "../extend-utils/utils";

server.tool(
  "select_items",
  "Select multiple objects",
  {
    uuids: z.array(z.string()).describe("Array of UUIDs"),
  },
  async ({ uuids }) => {
    const script = `
var doc = ${getDocumentScript};
var result = [];
var uuids = ${JSON.stringify(uuids)};
for (var i = 0; i < doc.pageItems.length; i++) {
  var item = doc.pageItems[i];
  for (var j = 0; j < uuids.length; j++) {
    if (uuids[j] === item.note) {
      item.selected = true;
      break;
    }
  }
}
`;
    executeExtendScript(script, []);
    return {
      content: [{ type: "text", text: "Objects selected." }],
    };
  }
);

server.tool(
  "group_items",
  "Group multiple objects",
  {
    uuids: z.array(z.string()).describe("Array of UUIDs"),
  },
  async ({ uuids }) => {
    const script = `
var doc = ${getDocumentScript};
var uuids = ${JSON.stringify(uuids)};
var items = [];
var group = doc.groupItems.add();
for (var i = 0; i < doc.pageItems.length; i++) {
  var item = doc.pageItems[i];
  for (var j = 0; j < uuids.length; j++) {
    if (uuids[j] === item.note) {
      items.push(item);
      break;
    }
  }
}
`;
    executeExtendScript(script, []);
    return {
      content: [{ type: "text", text: "Objects grouped." }],
    };
  }
);

server.tool(
  "remove_items",
  "Remove multiple objects",
  {
    uuids: z.array(z.string()).describe("Array of UUIDs"),
  },
  async ({ uuids }) => {
    const script = `
var doc = ${getDocumentScript};
var uuids = ${JSON.stringify(uuids)};
for (var i = 0; i < doc.pageItems.length; i++) {
  var item = doc.pageItems[i];
  for (var j = 0; j < uuids.length; j++) {
    if (uuids[j] === item.note) {
      item.remove();
      break;
    }
  }
}
`;
    executeExtendScript(script, []);
    return {
      content: [{ type: "text", text: "Objects removed." }],
    };
  }
);

const maskItemsSchema = z
  .array(
    z.object({
      maskUuid: z.string().describe("UUID of the path to be used as a mask"),
      maskedUuids: z
        .array(z.string())
        .describe("Array of UUIDs of objects to be masked"),
    })
  )
  .describe("Mask information");

server.tool(
  "mask_items",
  "Mask multiple objects",
  {
    masks: maskItemsSchema,
  },
  async ({ masks }) => {
    const script = `
var doc = ${getDocumentScript};
var masks = ${JSON.stringify(masks)};
for (var i = 0; i < masks.length; i++) {
  var maskInfo = masks[i];
  var group = doc.groupItems.add();

  // Add objects to be masked
  for (var j = 0; j < maskInfo.maskedUuids.length; j++) {
    var maskedItem = getPageItemScript(maskInfo.maskedUuids[j]);
    maskedItem.moveToBeginning(group);
  }

  // Add mask path
  var maskItem = getPageItemScript(maskInfo.maskUuid);
  maskItem.moveToBeginning(group);

  maskItem.clipping = true;
  group.clipped = true;
}
`;
    executeExtendScript(script, [getPageItemDefinition]);
    return {
      content: [{ type: "text", text: "Objects masked." }],
    };
  }
);
