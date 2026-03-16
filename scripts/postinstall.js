#!/usr/bin/env node
/**
 * postinstall 钩子：npm install -g openyida 后自动配置 IDE 集成
 *
 * 1. Claude Code：在 ~/.claude/skills/ 创建软链接指向内置 Skills
 * 2. 创建全局配置目录和默认 config.json
 * 3. 安装 yida-publish-page 的 npm 依赖
 */

"use strict";

const path = require("path");
const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(PACKAGE_ROOT, "skills");
const HOME_DIR = os.homedir();

/**
 * 静默执行，不抛错
 */
function safeExec(fn) {
  try { fn(); } catch { /* ignore */ }
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ── 1. Claude Code 集成 ──────────────────────────────────────────────

safeExec(() => {
  const claudeSkillsDir = path.join(HOME_DIR, ".claude", "skills");
  const symlinkPath = path.join(claudeSkillsDir, "openyida");

  ensureDir(claudeSkillsDir);

  // 创建/更新软链接
  if (fs.existsSync(symlinkPath)) {
    const stat = fs.lstatSync(symlinkPath);
    if (stat.isSymbolicLink()) {
      const currentTarget = fs.readlinkSync(symlinkPath);
      if (currentTarget === PACKAGE_ROOT) return; // 已正确链接
      fs.unlinkSync(symlinkPath);
    } else {
      // 不是软链接，跳过避免破坏用户数据
      return;
    }
  }

  fs.symlinkSync(PACKAGE_ROOT, symlinkPath, "junction");
});

// ── 2. 全局配置目录 ──────────────────────────────────────────────────

safeExec(() => {
  const globalConfigDir = process.platform === "win32"
    ? path.join(process.env.APPDATA || path.join(HOME_DIR, "AppData", "Roaming"), "openyida")
    : path.join(HOME_DIR, ".config", "openyida");

  ensureDir(globalConfigDir);
  ensureDir(path.join(globalConfigDir, "credentials"));
  ensureDir(path.join(globalConfigDir, "cache"));

  const configPath = path.join(globalConfigDir, "config.json");
  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      loginUrl: "https://www.aliwork.com/workPlatform",
      defaultBaseUrl: "https://www.aliwork.com",
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), "utf-8");
  }
});

// ── 3. OpenCode 插件注册 ────────────────────────────────────────────

safeExec(() => {
  const opencodeConfigDir = path.join(HOME_DIR, ".config", "opencode");
  const opencodeConfigPath = path.join(opencodeConfigDir, "opencode.json");

  if (fs.existsSync(opencodeConfigPath)) {
    const content = fs.readFileSync(opencodeConfigPath, "utf-8");
    const config = JSON.parse(content);

    if (!config.plugin) config.plugin = [];
    if (!config.plugin.includes("openyida")) {
      config.plugin.push("openyida");
      fs.writeFileSync(opencodeConfigPath, JSON.stringify(config, null, 2), "utf-8");
    }
  }
});

// ── 4. 安装 yida-publish-page 依赖 ──────────────────────────────────

safeExec(() => {
  const publishScriptsDir = path.join(SKILLS_DIR, "yida-publish-page", "scripts");
  const publishPackageJson = path.join(publishScriptsDir, "package.json");

  if (fs.existsSync(publishPackageJson)) {
    const nodeModulesDir = path.join(publishScriptsDir, "node_modules");
    if (!fs.existsSync(nodeModulesDir)) {
      execSync("npm install --production --no-audit --no-fund", {
        cwd: publishScriptsDir,
        stdio: "pipe",
        timeout: 60_000,
      });
    }
  }
});
