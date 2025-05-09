import { z } from "zod";

import { server } from "../server";
import { executeExtendScript, getDocumentScript } from "../extend-utils/utils";

server.tool(
  "select_items",
  "オブジェクトを選択する",
  {
    uuids: z.array(z.string()),
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
    executeExtendScript(script);
    return {
      content: [{ type: "text", text: "オブジェクトを選択しました．" }],
    };
  }
);

server.tool(
  "group_items",
  "オブジェクトをグループ化する",
  {
    uuids: z.array(z.string()),
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
    executeExtendScript(script);
    return {
      content: [{ type: "text", text: "オブジェクトをグループ化しました．" }],
    };
  }
);
