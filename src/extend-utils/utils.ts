import { execSync } from "child_process";
import fs, { mkdirSync } from "fs";
import os from "os";

import { jsonDefinition } from "./json";

export const executeExtendScript = (script: string) => {
  // 一時フォルダ生成
  const dir = `${os.homedir()}/illustrator-mcp-tmp`;
  if (!fs.existsSync(dir)) {
    mkdirSync(dir);
  }

  const scriptDefinitions = [
    createUUIDDefinition,
    getDocumentDefinition,
    getPageItemDefinition,
    jsonDefinition,
    ptToMmDefinition,
    toPtDefinition,
  ];

  // ExtendScript 生成
  const extendScriptPath = fs.realpathSync(`${dir}/message.jsx`);
  // 文字化け防止のために，BOM 付きで保存
  const combinedScript = `\ufeff
${scriptDefinitions.join("\n")}
${script}`;
  fs.writeFileSync(extendScriptPath, combinedScript);

  // AppleScript 生成
  const appleScript = `tell application "Adobe Illustrator"
    set resultText to do javascript of file "${extendScriptPath}"
end tell
return resultText`;
  const appleScriptPath = fs.realpathSync(`${dir}/message.scpt`);
  fs.writeFileSync(appleScriptPath, appleScript);

  // 実行
  const output = execSync(`osascript ${appleScriptPath}`);
  return output.toString();
};

const toPtDefinition = `
function mmToPt(mm) {
  return mm * (72 / 25.4);
}

function toPt(value) {
  if (value.indexOf("mm") !== -1) {
    var mm = parseFloat(value.replace("mm", ""));
    return mmToPt(mm);
  }
  if (value.indexOf("Q") !== -1) {
    var mm = parseFloat(value.replace("Q", "")) / 4;
    return mmToPt(mm);
  }
  return parseFloat(value);
}`;

const ptToMmDefinition = `
function ptToMm(pt) {
  return pt * (25.4 / 72) + "mm";
}`;

const getDocumentDefinition = `
function getDocument() {
  if (app.documents.length > 0) {
    return app.activeDocument;
  }
  return app.documents.add();
}`;

const getPageItemDefinition = `
function getPageItem(uuid) {
  var doc = getDocument();
  for (var i = 0; i < doc.pageItems.length; i++) {
    if (doc.pageItems[i].note === uuid) {
      return doc.pageItems[i];
    }
  }
  return null;
}`;

const createUUIDDefinition = `
function createUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    if (c === "x") {
      return r.toString(16);
    } else {
      return (r & 0x3 | 0x8).toString(16);
    }
  });
}`;
