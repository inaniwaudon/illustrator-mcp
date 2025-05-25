import z from "zod";

import { server } from "../server";
import { executeExtendScript } from "../extend-utils/utils";

server.tool(
  "open_document",
  "Opens a document.",
  {
    path: z.string().describe("Absolute path of the document to open"),
  },
  async ({ path }) => {
    const script = `
const file = new File("${path}");
var doc = app.open(file);
`;
    executeExtendScript(script);
    return {
      content: [{ type: "text", text: "Document opened." }],
    };
  }
);

server.tool(
  "create_document",
  "Create a document.",
  {
    width: z
      .string()
      .describe("Width of the document with units. Specify in mm."),
    height: z
      .string()
      .describe("Height of the document with units. Specify in mm."),
  },
  async ({ width, height }) => {
    const script = `
var doc = app.documents.add();
doc.artboards[0].artboardRect = [0, 0, toPt("${width}"), -toPt("${height}")];
`;
    executeExtendScript(script);
    return {
      content: [{ type: "text", text: "Document created." }],
    };
  }
);

server.tool(
  "save_document",
  "Saves the document.",
  {
    path: z
      .string()
      .optional()
      .describe("Absolute path of the document to save"),
  },
  async ({ path }) => {
    const script = `
var doc = getDocument();
var filePath = "${path ?? ""}";
var newFile = new File(filePath);
var pdfOptions = new PDFSaveOptions();

if (filePath !== "") {
  if (filePath.indexOf(".pdf") !== -1) {
    doc.saveAs(newFile, pdfOptions);
  } else {
    doc.saveAs(newFile);
  }
} else {
  doc.save();
}
`;
    executeExtendScript(script);
    return {
      content: [{ type: "text", text: "Document saved." }],
    };
  }
);

server.tool(
  "duplicate_artboard",
  "Duplicates the first artboard.",
  {
    count: z.number().describe("Number of artboards to duplicate"),
  },
  async ({ count }) => {
    const script = `
var doc = getDocument();
var sourceArtboard = doc.artboards[0];

var artboardRect = sourceArtboard.artboardRect;
var left = artboardRect[0];
var top = artboardRect[1];
var width = artboardRect[2] - artboardRect[0];
var height = artboardRect[1] - artboardRect[3];

doc.artboards.setActiveArtboardIndex(0);
app.executeMenuCommand("selectall");
app.executeMenuCommand("copy");

for (var i = 0; i < ${count}; i++) {
  var newLeft = left + width + width * i + 5 * (i + 1);
  doc.artboards.add([newLeft, top, newLeft + width, top - height]);

  var newIndex = doc.artboards.length - 1;
  doc.artboards.setActiveArtboardIndex(newIndex);
  app.executeMenuCommand("pasteInPlace");
}`;
    executeExtendScript(script);
    return {
      content: [{ type: "text", text: "Artboard duplicated." }],
    };
  }
);
