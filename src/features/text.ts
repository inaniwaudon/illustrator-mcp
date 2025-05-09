import z from "zod";

import { server } from "../server";
import {
  createUUIDScript,
  executeExtendScript,
  getDocumentScript,
  getPageItemScript,
  ptToMmScript,
  toPt,
} from "../extend-utils/utils";
import { jsonScript } from "../extend-utils/json";

server.tool(
  "create_textframes",
  "複数のテキストフレームをドキュメントに配置する．",
  { count: z.number().describe("配置するテキストフレームの数") },
  async ({ count }) => {
    const script = `
var doc = ${getDocumentScript};
var result = [];
for (var i = 0; i < ${count}; i++) {
  var textFrame = doc.textFrames.add();
  textFrame.note = ${createUUIDScript};
  result.push({ uuid: textFrame.note });
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

server.tool(
  "list_textframes",
  "既存のテキストフレームの情報を取得する",
  {},
  async () => {
    const script = `
${jsonScript}
${ptToMmScript}

var doc = ${getDocumentScript};
var result = [];
for (var i = 0; i < doc.textFrames.length; i++) {
  var item = doc.textFrames[i];
  if (!item.note) {
    item.note = ${createUUIDScript};
  }
  result.push({
    uuid: item.note,
    text: item.contents,
    fontName: item.textRange.characterAttributes.textFont.name,
    fontSize: item.textRange.characterAttributes.size,
    justification: item.textRange.paragraphAttributes.justification,
    position: [ptToMm(item.left), -ptToMm(item.top)],
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
  }
);

const changeTextFramesSchema = z
  .array(
    z.object({
      uuid: z.string().describe("UUID"),
      text: z.string().optional().describe("テキストの内容"),
      fontName: z.string().optional().describe("フォント名"),
      fontSize: z
        .string()
        .optional()
        .describe("フォントサイズ．mm か Q で指定する．"),
      justification: z
        .enum(["left", "center", "right", "justify"])
        .optional()
        .describe(
          "テキストの揃え方向．left：左揃え，center：中央揃え，right：右揃え，justify：両端揃え．"
        ),
      colorCmyk: z
        .array(z.number())
        .length(4)
        .optional()
        .describe("文字色．0–100 の CMYK の配列で指定する．"),
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
  .describe("変更するテキストフレームの UUID および属性の配列");

server.tool(
  "change_textframes",
  "複数のテキストフレームの属性を変更する",
  {
    changes: changeTextFramesSchema,
  },
  async ({ changes }) => {
    let lines: string[] = [];
    for (const change of changes) {
      lines.push("(function () {");
      lines.push(`var item = ${getPageItemScript(change.uuid)};`);
      if (change.text) {
        lines.push(
          `item.contents = "${change.text?.replaceAll("\n", "\\n")}";`
        );
      }
      if (change.fontName) {
        lines.push(
          `item.textRange.characterAttributes.textFont = app.textFonts.getByName("${change.fontName}");`
        );
      }
      if (change.fontSize) {
        lines.push(
          `item.textRange.characterAttributes.size = ${toPt(change.fontSize)};`
        );
      }
      if (change.justification) {
        lines.push(`
var str = "${change.justification}";
var justification = Justification.FULLJUSTIFY;
if (str === "left") {
  justification = Justification.LEFT;
}
if (str === "center") {
  justification = Justification.CENTER;
}
if (str === "right") {
  justification = Justification.RIGHT;
}
item.paragraphs[0].paragraphAttributes.justification = justification;`);
      }

      const cmyk = change.colorCmyk;
      if (cmyk) {
        lines.push(`
var cmyk = new CMYKColor();
cmyk.cyan = ${cmyk[0]};
cmyk.magenta = ${cmyk[1]};
cmyk.yellow = ${cmyk[2]};
cmyk.black = ${cmyk[3]};
item.textRange.characterAttributes.fillColor = cmyk;`);
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

const changeCharactersSchema = z.array(
  z.object({
    range: z.object({ from: z.number(), to: z.number() }),
    fontName: z.string().optional().describe("フォント名"),
    fontSize: z
      .string()
      .optional()
      .describe("フォントサイズ．mm か Q で指定する．"),
    baselineShift: z
      .string()
      .optional()
      .describe("ベースラインシフト．mm か Q で指定する．"),
    horizontalScale: z
      .number()
      .optional()
      .describe("水平比率．100 で 100% を示す．"),
    verticalScale: z
      .number()
      .optional()
      .describe("垂直比率．100 で 100% を示す．"),
    colorCmyk: z
      .array(z.number())
      .length(4)
      .optional()
      .describe("文字色．0–100 の CMYK の配列で指定する．"),
  })
);

server.tool(
  "change_characters",
  "単一のテキストフレームにおける，複数の範囲内の文字の属性を変更する",
  {
    uuid: z.string(),
    changes: changeCharactersSchema,
  },
  async ({ uuid, changes }) => {
    let lines: string[] = [`var item = ${getPageItemScript(uuid)};`];
    for (const change of changes) {
      lines.push(`
(function () {
  var chars = item.characters.slice(${change.range.from}, ${change.range.to});
  for (var i = 0; i < chars.length; i++) {
    var charAttr = chars[i].characterAttributes;
`);
      if (change.fontName) {
        lines.push(
          `charAttr.textFont = app.textFonts.getByName("${change.fontName}");`
        );
      }
      if (change.fontSize) {
        lines.push(`charAttr.size = ${toPt(change.fontSize)};`);
      }
      if (change.baselineShift) {
        lines.push(`charAttr.baselineShift = ${toPt(change.baselineShift)};`);
      }
      if (change.horizontalScale) {
        lines.push(`charAttr.horizontalScale = ${change.horizontalScale};`);
      }
      if (change.verticalScale) {
        lines.push(`charAttr.verticalScale = ${change.verticalScale};`);
      }
      const cmyk = change.colorCmyk;
      if (cmyk) {
        lines.push(`
var cmyk = new CMYKColor();
cmyk.cyan = ${cmyk[0]};
cmyk.magenta = ${cmyk[1]};
cmyk.yellow = ${cmyk[2]};
cmyk.black = ${cmyk[3]};
charAttr.fillColor = cmyk;`);
      }
      lines.push(`}
}());`);
    }
    executeExtendScript(lines.join("\n"));
    return {
      content: [{ type: "text", text: "正常に変更されました．" }],
    };
  }
);

server.tool("list_fonts", "使用可能なフォント一覧を取得する", {}, async () => {
  const script = `
${jsonScript}
var fonts = app.textFonts;
var result = [];
for (var i = 0; i < fonts.length; i++) {
  result.push({ name: fonts[i].name, family: fonts[i].family, style: fonts[i].style });
}
JSON.stringify(result);
`;
  const output = executeExtendScript(script);
  return {
    content: [{ type: "text", text: `正常に取得しました．\n\n${output}` }],
  };
});
