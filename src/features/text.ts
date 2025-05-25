import z from "zod";

import { server } from "../server";
import { executeExtendScript } from "../extend-utils/utils";

server.tool(
  "create_textframes",
  "Places multiple text frames in the document.",
  { count: z.number().describe("Number of text frames to place") },
  async ({ count }) => {
    const script = `
var doc = getDocument();
var result = [];
for (var i = 0; i < ${count}; i++) {
  var textFrame = doc.textFrames.add();
  textFrame.note = createUUID();
  result.push({ uuid: textFrame.note });
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
  "list_textframes",
  "Gets information of existing text frames.",
  {},
  async () => {
    const script = `
var doc = getDocument();
var results = [];
var result = {};
var item = null;
var charAttr = null;
var paragraphAttr = null;

for (var i = 0; i < doc.textFrames.length; i++) {
  item = doc.textFrames[i];
  if (!item.note) {
    item.note = createUUID();
  }
  result = {
    uuid: item.note,
    name: item.name,
    text: item.contents,
    x: ptToMm(item.left),
    y: ptToMm(-item.top),
    width: ptToMm(item.width),
    height: ptToMm(item.height),
    selected: item.selected,
    locked: item.locked,
  };
  if (item.characters.length > 0) {
    charAttr = item.characters[0].characterAttributes;
    paragraphAttr = item.paragraphs[0].paragraphAttributes;
    try {
      result.fontName = charAttr.textFont.name;
    } catch (e) {
      result.fontName = "";
    }
    try {
      result.lineHeight = charAttr.leading;
    } catch (e) {
      result.lineHeight = 0;
    }
    try {
      result.fontSize = charAttr.size;
    } catch (e) {
      result.fontSize = 0;
    }
    try {
      result.justification = paragraphAttr.justification;
    } catch (e) {
      result.justification = "";
    }
  }
  results.push(result);
}
JSON.stringify(results);
`;
    const output = executeExtendScript(script);
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
          "X and Y coordinates with units. Origin at top left. Specify in mm or Q."
        ),
      size: z
        .array(z.string())
        .optional()
        .describe("Width and height with units. Specify in mm or Q."),
    })
  )
  .describe("Array of UUIDs and attributes of text frames to change");

server.tool(
  "change_textframes",
  "Changes attributes of multiple text frames. Maximum 10 items.",
  {
    changes: changeTextFramesSchema,
  },
  async ({ changes }) => {
    const script = `
function run() {
  var inputs = ${JSON.stringify(changes)};
  var item = null;
  
  for (var i = 0; i < inputs.length; i++) {
    item = getPageItem(inputs[i].uuid);
    if (inputs[i].text) {
      item.contents = inputs[i].text.replace(/\\n/g, "\\n");
    }
    if (inputs[i].fontName) {
      item.textRange.characterAttributes.textFont = app.textFonts.getByName(inputs[i].fontName);
    }
    if (inputs[i].fontSize) {
      item.textRange.characterAttributes.size = toPt(inputs[i].fontSize);
    }
    /*if (inputs[i].justification) {
      var str = inputs[i].justification;
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
      item.paragraphs[0].paragraphAttributes.justification = justification;
    }*/
    if (inputs[i].colorCmyk) {
      var cmyk = new CMYKColor();
      cmyk.cyan = inputs[i].colorCmyk[0];
      cmyk.magenta = inputs[i].colorCmyk[1];
      cmyk.yellow = inputs[i].colorCmyk[2];
      cmyk.black = inputs[i].colorCmyk[3];
      item.textRange.characterAttributes.fillColor = cmyk;
    }
    if (inputs[i].position) {
      var x = toPt(inputs[i].position[0]);
      var y = -toPt(inputs[i].position[1]);
      item.position = [x, y];
    }
    if (inputs[i].size) {
      var width = toPt(inputs[i].size[0]);
      var height = toPt(inputs[i].size[1]);
      item.size = [width, height];
    }
    $.gc();
  }
}
run();
`;
    executeExtendScript(script);
    return {
      content: [{ type: "text", text: "Changed successfully." }],
    };
  }
);

const changeCharactersSchema = z.array(
  z.object({
    range: z.object({ from: z.number(), to: z.number() }),
    fontName: z.string().optional().describe("Font name"),
    fontSize: z.string().optional().describe("Font size. Specify in mm or Q."),
    lineHeight: z
      .string()
      .optional()
      .describe("Line height. Specify in mm or Q."),
    baselineShift: z
      .string()
      .optional()
      .describe("Baseline shift. Specify in mm or Q."),
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
      .describe("Text color. Array of CMYK values from 0 to 100."),
  })
);

server.tool(
  "change_characters",
  "Changes attributes of multiple character ranges in a single text frame. Maximum 10 items.",
  {
    uuid: z.string(),
    changes: changeCharactersSchema,
  },
  async ({ uuid, changes }) => {
    const script = `
var inputs = ${JSON.stringify(changes)};
var item = getPageItem("${uuid}");

for (var i = 0; i < inputs.length; i++) {
  var from = Math.min(inputs[i].range.from, item.characters.length);
  var to = Math.min(inputs[i].range.to, item.characters.length);
  for (var j = from; j < to; j++) {
    var character = item.characters[j];
    var charAttr = character.characterAttributes;

    if (inputs[i].fontName) {
      charAttr.textFont = app.textFonts.getByName(inputs[i].fontName);
    }
    if (inputs[i].fontSize) {
      charAttr.size = toPt(inputs[i].fontSize);
    }
    if (inputs[i].lineHeight) {
      charAttr.leading = toPt(inputs[i].lineHeight);
      charAttr.autoLeading = false;
    }
    if (inputs[i].baselineShift) {
      charAttr.baselineShift = toPt(inputs[i].baselineShift);
    }
    if (inputs[i].horizontalScale) {
      charAttr.horizontalScale = inputs[i].horizontalScale;
    }
    if (inputs[i].verticalScale) {
      charAttr.verticalScale = inputs[i].verticalScale;
    }
    if (inputs[i].colorCmyk) {
      var cmyk = new CMYKColor();
      cmyk.cyan = inputs[i].colorCmyk[0];
      cmyk.magenta = inputs[i].colorCmyk[1];
      cmyk.yellow = inputs[i].colorCmyk[2];
      cmyk.black = inputs[i].colorCmyk[3];
      charAttr.fillColor = cmyk;
    }
  }
}
`;
    executeExtendScript(script);
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
  const output = executeExtendScript(script);
  return {
    content: [{ type: "text", text: `Retrieved successfully.\n\n${output}` }],
  };
});
