import z from "zod";

import { server } from "../server";
import { jsonScript } from "../extend-utils/json";
import {
  createUUIDScript,
  executeExtendScript,
  getDocumentScript,
  getPageItemScript,
  getPageItemScriptDefinition,
  ptToMmScript,
} from "../extend-utils/utils";

server.tool(
  "create_images",
  "複数の画像をドキュメントに配置する．",
  { paths: z.array(z.string()).describe("画像のパス") },
  async ({ paths }) => {
    const script = `
var doc = ${getDocumentScript};
var paths = ${JSON.stringify(paths)};
var result = [];
for (var i = 0; i < paths.length; i++) {
  var image = doc.placedItems.add();
  image.file = new File(paths[i]);
  image.note = ${createUUIDScript};
  result.push({ uuid: image.note });
}
JSON.stringify(result);
`;
    const output = executeExtendScript(script);
    return {
      content: [
        {
          type: "text",
          text: `正常に配置されました．\n\n${output}`,
        },
      ],
    };
  }
);

server.tool("list_images", "既存の画像の情報を取得する", {}, async () => {
  const script = `
${jsonScript}
${ptToMmScript}

var doc = ${getDocumentScript};
var result = [];
for (var i = 0; i < doc.placedItems.length; i++) {
  var item = doc.placedItems[i];
  if (!item.note) {
    item.note = ${createUUIDScript};
  }
  result.push({
    uuid: item.note,
    path: item.file.name,
    position: [ptToMm(item.left), ptToMm(-item.top)],
    size: [ptToMm(item.width), ptToMm(item.height)],
    selected: item.selected,
  });
}
JSON.stringify(result);
`;
  const output = executeExtendScript(script);
  return {
    content: [{ type: "text", text: `正常に取得しました．\n\n${output}` }],
  };
});

const multipleImageChangeSchema = z
  .array(
    z.object({
      uuid: z.string().describe("UUID"),
      path: z.string().describe("画像のパス"),
      position: z
        .array(z.string())
        .optional()
        .describe("x 座標，y座標．左上を原点とする．mm か Q で指定する．"),
      size: z
        .array(z.string())
        .optional()
        .describe("幅，高さ．mm か Q で指定する．"),
    })
  )
  .describe("変更する画像の UUID および属性の配列");

server.tool(
  "change_images",
  "複数の画像の属性を変更する",
  {
    changes: multipleImageChangeSchema,
  },
  async ({ changes }) => {
    const script = `
  ${getPageItemScriptDefinition}
  var changes = ${JSON.stringify(changes)};
  for (var i = 0; i < changes.length; i++) {
    var item = getPageItemScript(changes[i].uuid);
    if (changes[i].file) {
      item.file = new File(changes[i].file);
    }
    if (changes[i].position) {
      item.position = [toPt(changes[i].position[0]), toPt(changes[i].position[1])];
    }
    if (changes[i].size) {
      item.size = [toPt(changes[i].size[0]), toPt(changes[i].size[1])];
    }
  }
`;
    executeExtendScript(script);
    return {
      content: [{ type: "text", text: "正常に変更されました．" }],
    };
  }
);
