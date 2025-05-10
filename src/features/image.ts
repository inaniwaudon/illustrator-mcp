import z from "zod";

import { server } from "../server";
import { jsonScript } from "../extend-utils/json";
import {
  createUUIDScript,
  executeExtendScript,
  getDocumentScript,
  getPageItemDefinition,
  ptToMmDefinition,
  toPtDefinition,
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
    const output = executeExtendScript(script, []);
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
    x: ptToMm(item.left),
    y: ptToMm(-item.top),
    width: ptToMm(item.width),
    height: ptToMm(item.height),
    selected: item.selected,
  });
}
JSON.stringify(result);
`;
  const output = executeExtendScript(script, [ptToMmDefinition]);
  return {
    content: [{ type: "text", text: `正常に取得しました．\n\n${output}` }],
  };
});

const multipleImageChangeSchema = z
  .array(
    z.object({
      uuid: z.string().describe("UUID"),
      path: z.string().describe("画像のパス"),
      x: z
        .string()
        .optional()
        .describe("x 座標．左上を原点とする．mm か Q で指定する．"),
      y: z
        .string()
        .optional()
        .describe("y 座標．左上を原点とする．mm か Q で指定する．"),
      width: z.string().optional().describe("幅．mm か Q で指定する．"),
      height: z.string().optional().describe("高さ．mm か Q で指定する．"),
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
  var changes = ${JSON.stringify(changes)};
  for (var i = 0; i < changes.length; i++) {
    var item = getPageItemScript(changes[i].uuid);
    if (changes[i].file) {
      item.file = new File(changes[i].file);
    }
    if (changes[i].x) {
      item.left = toPt(changes[i].x);
    }
    if (changes[i].y) {
      item.top = -toPt(changes[i].y);
    }
    if (changes[i].width) {
      item.width = toPt(changes[i].width);
    }
    if (changes[i].height) {
      item.height = toPt(changes[i].height);
    }
  }
`;
    executeExtendScript(script, [getPageItemDefinition, toPtDefinition]);
    return {
      content: [{ type: "text", text: "正常に変更されました．" }],
    };
  }
);
