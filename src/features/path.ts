import { z } from "zod";

import {
  getDocumentScript,
  createUUIDScript,
  executeExtendScript,
  getPageItemScript,
  toPt,
  ptToMmScript,
} from "../extend-utils/utils";
import { server } from "../server";
import { jsonScript } from "../extend-utils/json";

// 矩形
const createRectsSchema = z.array(
  z.object({
    position: z
      .array(z.string())
      .describe("x 座標，y座標．左上を原点とする．mm か Q で指定する．"),
    size: z.array(z.string()).describe("幅，高さ．mm か Q で指定する．"),
  })
);

server.tool(
  "create_rects",
  "矩形を表す複数のパスをドキュメントに配置する",
  { rects: createRectsSchema },
  async ({ rects }) => {
    let script = [
      `
${jsonScript}
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
    const output = executeExtendScript(script.join("\n"));
    return {
      content: [{ type: "text", text: `正常に作成しました．\n\n${output}` }],
    };
  }
);

// 直線
const createLinesSchema = z.array(
  z.object({
    points: z
      .object({
        from: z.array(z.string()).length(2),
        to: z.array(z.string()).length(2),
      })
      .describe(
        "始点および終点の x, y 座標．左上を原点とする．mm か Q で指定する．"
      ),
  })
);

server.tool(
  "create_lines",
  "直線を表す複数のパスをドキュメントに配置する．",
  { lines: createLinesSchema },
  async ({ lines }) => {
    let script = [
      `
${jsonScript}
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
    const output = executeExtendScript(script.join("\n"));
    return {
      content: [{ type: "text", text: `正常に作成しました．\n\n${output}` }],
    };
  }
);

// 共通
server.tool("list_pathitems", "既存のパスの情報を取得する", {}, async () => {
  const script = `
${jsonScript}
${ptToMmScript}

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
  const output = executeExtendScript(script);
  return {
    content: [{ type: "text", text: `正常に取得しました．\n\n${output}` }],
  };
});

const multiplePathChangeSchema = z
  .array(
    z.object({
      uuid: z.string(),
      fillCmyk: z
        .array(z.string())
        .describe("塗りの色．0 から 100 の範囲で指定する．"),
      strokeCmyk: z
        .array(z.string())
        .describe("線の色．0 から 100 の範囲で指定する．"),
      strokeWidth: z.string().describe("線の太さ．mm か Q で指定する．"),
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
  .describe("変更するパスの UUID および属性の配列");

server.tool(
  "change_pathitems",
  "複数のパスの属性を変更する",
  {
    changes: multiplePathChangeSchema,
  },
  async ({ changes }) => {
    let lines: string[] = [];
    for (const change of changes) {
      lines.push("(function () {");
      lines.push(`var item = ${getPageItemScript(change.uuid)};`);

      // 塗り
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

      // 線
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

      // 座標とサイズ
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
    executeExtendScript(lines.join("\n"));
    return {
      content: [{ type: "text", text: "正常に変更されました．" }],
    };
  }
);
