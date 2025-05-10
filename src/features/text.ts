import z from "zod";

import { server } from "../server";
import {
  createUUIDScript,
  executeExtendScript,
  getDocumentScript,
  getPageItemScript,
  ptToMmDefinition,
  toPt,
} from "../extend-utils/utils";
import { jsonDefinition } from "../extend-utils/json";

server.tool(
  "create_textframes",
  "Place multiple text frames in the document.",
  { count: z.number().describe("Number of text frames to place") },
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
    const output = executeExtendScript(script, []);
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
  "list_textframes",
  "Get information of existing text frames",
  {},
  async () => {
    const script = `
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
    const output = executeExtendScript(script, [
      jsonDefinition,
      ptToMmDefinition,
    ]);
    return {
      content: [{ type: "text", text: `Retrieved successfully.\n\n${output}` }],
    };
  }
);

const changeTextFramesSchema = z
  .array(
    z.object({
      uuid: z.string().describe("UUID"),
      text: z.string().optional().describe("Text content"),
      fontName: z.string().optional().describe("Font name"),
      fontSize: z
        .string()
        .optional()
        .describe("Font size (specify in mm or Q)"),
      justification: z
        .enum(["left", "center", "right", "justify"])
        .optional()
        .describe(
          "Text alignment direction. left: left, center: center, right: right, justify: justify."
        ),
      colorCmyk: z
        .array(z.number())
        .length(4)
        .optional()
        .describe("Text color (array of CMYK values from 0 to 100)"),
      position: z
        .array(z.string())
        .optional()
        .describe(
          "X and Y coordinates (origin at top left, specify in mm or Q)"
        ),
      size: z
        .array(z.string())
        .optional()
        .describe("Width and height (specify in mm or Q)"),
    })
  )
  .describe("Array of UUIDs and attributes of text frames to change");

server.tool(
  "change_textframes",
  "Change attributes of multiple text frames",
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
var str = \"${change.justification}\";
var justification = Justification.FULLJUSTIFY;
if (str === \"left\") {
  justification = Justification.LEFT;
}
if (str === \"center\") {
  justification = Justification.CENTER;
}
if (str === \"right\") {
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
    executeExtendScript(lines.join("\n"), []);
    return {
      content: [{ type: "text", text: "Changed successfully." }],
    };
  }
);

const changeCharactersSchema = z.array(
  z.object({
    range: z.object({ from: z.number(), to: z.number() }),
    fontName: z.string().optional().describe("Font name"),
    fontSize: z.string().optional().describe("Font size (specify in mm or Q)"),
    baselineShift: z
      .string()
      .optional()
      .describe("Baseline shift (specify in mm or Q)"),
    horizontalScale: z
      .number()
      .optional()
      .describe("Horizontal scale (100 means 100%)"),
    verticalScale: z
      .number()
      .optional()
      .describe("Vertical scale (100 means 100%)"),
    colorCmyk: z
      .array(z.number())
      .length(4)
      .optional()
      .describe("Text color (array of CMYK values from 0 to 100)"),
  })
);

server.tool(
  "change_characters",
  "Change attributes of multiple character ranges in a single text frame",
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
          `charAttr.textFont = app.textFonts.getByName(\"${change.fontName}\");`
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
    executeExtendScript(lines.join("\n"), []);
    return {
      content: [{ type: "text", text: "Changed successfully." }],
    };
  }
);

server.tool("list_fonts", "Get list of available fonts", {}, async () => {
  const script = `
var fonts = app.textFonts;
var result = [];
for (var i = 0; i < fonts.length; i++) {
  result.push({ name: fonts[i].name, family: fonts[i].family, style: fonts[i].style });
}
JSON.stringify(result);
`;
  const output = executeExtendScript(script, [jsonDefinition]);
  return {
    content: [{ type: "text", text: `Retrieved successfully.\n\n${output}` }],
  };
});
