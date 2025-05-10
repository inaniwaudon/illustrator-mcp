import { z } from "zod";

import { server } from "../server";
import {
  executeExtendScript,
  getDocumentScript,
  getPageItemDefinition,
} from "../extend-utils/utils";

server.tool(
  "select_items",
  "複数のオブジェクトを選択する",
  {
    uuids: z.array(z.string()).describe("UUID の配列"),
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
      content: [{ type: "text", text: "オブジェクトを選択しました．" }],
    };
  }
);

server.tool(
  "group_items",
  "複数のオブジェクトをグループ化する",
  {
    uuids: z.array(z.string()).describe("UUID の配列"),
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
      content: [{ type: "text", text: "オブジェクトをグループ化しました．" }],
    };
  }
);

server.tool(
  "remove_items",
  "複数のオブジェクトを削除する",
  {
    uuids: z.array(z.string()).describe("UUID の配列"),
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
      content: [{ type: "text", text: "オブジェクトを削除しました．" }],
    };
  }
);

const maskItemsSchema = z
  .array(
    z.object({
      maskUuid: z.string().describe("マスクするパスの UUID"),
      maskedUuids: z
        .array(z.string())
        .describe("マスクされる対象のオブジェクトの UUID の配列"),
    })
  )
  .describe("マスクの情報");

server.tool(
  "mask_items",
  "複数のオブジェクトをマスクする",
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

  // マスク対象のオブジェクトを追加
  for (var j = 0; j < maskInfo.maskedUuids.length; j++) {
    var maskedItem = getPageItemScript(maskInfo.maskedUuids[j]);
    maskedItem.moveToBeginning(group);
  }

  // パスを追加
  var maskItem = getPageItemScript(maskInfo.maskUuid);
  maskItem.moveToBeginning(group);

  maskItem.clipping = true;
  group.clipped = true;
}
`;
    executeExtendScript(script, [getPageItemDefinition]);
    return {
      content: [{ type: "text", text: "オブジェクトを削除しました．" }],
    };
  }
);
