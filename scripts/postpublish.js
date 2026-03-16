#!/usr/bin/env node
/**
 * postpublish 钩子：npm publish 后清理 skills 目录
 *
 * 因为 skills 目录不提交到 git，发布后需要清理
 */

"use strict";

const path = require("path");
const fs = require("fs");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(PACKAGE_ROOT, "skills");

/**
 * 删除目录
 */
function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

console.log("\n[postpublish] 清理 skills 目录...");
removeDir(SKILLS_DIR);
console.log("[postpublish] 清理完成！\n");
