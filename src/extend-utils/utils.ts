import { execSync } from "child_process";
import fs, { mkdirSync } from "fs";
import os from "os";

export const executeExtendScript = (script: string, definitions: string[]) => {
  // 一時フォルダ生成
  const dir = `${os.homedir()}/illustrator-mcp-tmp`;
  if (!fs.existsSync(dir)) {
    mkdirSync(dir);
  }

  // ExtendScript 生成
  const extendScriptPath = fs.realpathSync(`${dir}/message.jsx`);
  // 文字化け防止のために，BOM 付きで保存
  const combinedScript = `\ufeff
  ${definitions.join("\n")}
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

export const toPt = (value: string) => {
  if (value.includes("mm")) {
    const mm = Number.parseFloat(value.replace("mm", ""));
    return mmToPt(mm);
  }
  if (value.includes("Q")) {
    const mm = Number.parseFloat(value.replace("Q", "")) / 4;
    return mmToPt(mm);
  }
  return Number.parseFloat(value);
};

const mmToPt = (mm: number) => {
  return mm * (72 / 25.4);
};

export const toPtDefinition = `
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

export const ptToMmDefinition = `
function ptToMm(pt) {
  return pt * (25.4 / 72) + "mm";
}`;

export const getDocumentScript = `
(function () {
  if (app.documents.length > 0) {
    return app.activeDocument;
  }
  return app.documents.add();
}());`;

export const getPageItemDefinition = `
function getPageItem(uuid) {
  var doc = ${getDocumentScript};
  for (var i = 0; i < doc.pageItems.length; i++) {
    if (doc.pageItems[i].note === uuid) {
      return doc.pageItems[i];
    }
  }
  return null;
}`;

export const getPageItemScript = (uuid: string) => `
(function () {
  var doc = ${getDocumentScript};
  for (var i = 0; i < doc.pageItems.length; i++) {
    if (doc.pageItems[i].note === "${uuid}") {
      return doc.pageItems[i];
    }
  }
  return null;
}());`;

export const createUUIDScript = `
(function () {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    if (c === "x") {
      return r.toString(16);
    } else {
      return (r & 0x3 | 0x8).toString(16);
    }
  });
}());`;
