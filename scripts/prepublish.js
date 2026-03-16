#!/usr/bin/env node
/**
 * prepublishOnly 钩子：npm publish 前从 yida-skills 仓库同步 Skills
 *
 * 流程：
 * 1. 克隆/拉取 yida-skills 仓库到临时目录
 * 2. 复制所有 skills 到本地 skills/ 目录
 * 3. 安装 yida-publish-page 的依赖
 */

"use strict";

const path = require("path");
const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(PACKAGE_ROOT, "skills");
const YIDA_SKILLS_REPO = "https://github.com/openyida/yida-skills.git";

/**
 * 执行命令
 */
function exec(command, cwd) {
  console.log(`[prepublish] $ ${command}`);
  execSync(command, { cwd, stdio: "inherit" });
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 递归复制目录
 */
function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 删除目录
 */
function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

console.log("\n[prepublish] 开始同步 Skills from yida-skills...\n");

// 1. 创建临时目录
const tempDir = path.join(os.tmpdir(), `yida-skills-${Date.now()}`);
ensureDir(tempDir);

try {
  // 2. 克隆 yida-skills 仓库
  exec(`git clone --depth 1 ${YIDA_SKILLS_REPO} .`, tempDir);

  // 3. 清理本地 skills 目录
  removeDir(SKILLS_DIR);
  ensureDir(SKILLS_DIR);

  // 4. 从 yida-skills 仓库的 skills/ 子目录复制所有 skill
  const remoteSkillsDir = path.join(tempDir, "skills");
  if (!fs.existsSync(remoteSkillsDir)) {
    throw new Error("yida-skills 仓库中没有 skills/ 目录");
  }
  
  const entries = fs.readdirSync(remoteSkillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith("yida-")) {
      const srcPath = path.join(remoteSkillsDir, entry.name);
      const destPath = path.join(SKILLS_DIR, entry.name);
      console.log(`[prepublish] 复制 ${entry.name}...`);
      copyDir(srcPath, destPath);
    }
  }

  console.log(`\n[prepublish] Skills 同步完成！共 ${fs.readdirSync(SKILLS_DIR).length} 个 skills\n`);

  // 5. 安装 yida-publish-page 的依赖
  const publishScriptsDir = path.join(SKILLS_DIR, "yida-publish-page", "scripts");
  const publishPackageJson = path.join(publishScriptsDir, "package.json");

  if (fs.existsSync(publishPackageJson)) {
    console.log("[prepublish] 安装 yida-publish-page 依赖...");
    exec("npm install --production --no-audit --no-fund", publishScriptsDir);
  }

} finally {
  // 6. 清理临时目录
  removeDir(tempDir);
}
