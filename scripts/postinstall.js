#!/usr/bin/env node
/**
 * postinstall 钩子：npm install -g openyida 后自动配置 IDE 集成
 *
 * 1. 本地开发：同步 yida-skills 到 skills/ 目录
 * 2. Claude Code / OpenCode / Cursor / VS Code：在 ~/.claude/skills/ 创建软链接
 *    各 IDE 通过扫描该目录自动发现技能，无需额外配置
 * 3. 悟空（Wukong）：将每个技能复制到 ~/.real/.skills/<uuid>/ 独立目录
 * 4. 创建全局配置目录和默认 config.json
 * 5. 安装 yida-publish-page 的 npm 依赖
 */

"use strict";

const path = require("path");
const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(PACKAGE_ROOT, "skills");
const HOME_DIR = os.homedir();
const YIDA_SKILLS_REPO = "https://github.com/openyida/yida-skills.git";

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

// ── 1. 本地开发：同步 yida-skills 到 skills/ ────────────────────────────

safeExec(() => {
  if (fs.existsSync(SKILLS_DIR)) {
    const entries = fs.readdirSync(SKILLS_DIR);
    const hasSkills = entries.some(e => e.startsWith("yida-"));
    if (hasSkills) return;
  }

  console.log("[openyida] 正在同步 Skills...");

  const tempDir = path.join(os.tmpdir(), `yida-skills-${Date.now()}`);
  ensureDir(tempDir);

  try {
    execSync(`git clone --depth 1 ${YIDA_SKILLS_REPO} .`, {
      cwd: tempDir,
      stdio: "pipe",
    });

    const remoteSkillsDir = path.join(tempDir, "skills");
    if (!fs.existsSync(remoteSkillsDir)) {
      console.log("[openyida] 跳过：yida-skills 仓库无 skills/ 目录");
      return;
    }

    ensureDir(SKILLS_DIR);
    const entries = fs.readdirSync(remoteSkillsDir, { withFileTypes: true });
    let count = 0;

    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith("yida-")) continue;
      const src = path.join(remoteSkillsDir, entry.name);
      const dest = path.join(SKILLS_DIR, entry.name);

      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true });
      }

      function copyDir(src, dest) {
        ensureDir(dest);
        for (const e of fs.readdirSync(src, { withFileTypes: true })) {
          const s = path.join(src, e.name);
          const d = path.join(dest, e.name);
          if (e.isDirectory()) copyDir(s, d);
          else fs.copyFileSync(s, d);
        }
      }

      copyDir(src, dest);
      count++;
    }

    console.log(`[openyida] 已同步 ${count} 个 Skills`);
  } catch (e) {
    console.log("[openyida] 跳过：无法同步 Skills（网络或权限问题）");
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
});

// ── 2. Claude Code 集成 ──────────────────────────────────────────────

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

// ── 3. 悟空（Wukong）集成 ────────────────────────────────────────────

safeExec(() => {
  const wukongDir = path.join(HOME_DIR, ".real");
  const wukongSkillsDir = path.join(wukongDir, ".skills");

  // 只在悟空目录存在时才集成
  if (!fs.existsSync(wukongDir)) return;
  if (!fs.existsSync(SKILLS_DIR)) return;

  ensureDir(wukongSkillsDir);

  // 读取已有的 openyida 技能映射（用于更新时保持 UUID 一致）
  const mappingPath = path.join(wukongSkillsDir, ".openyida-mapping.json");
  let skillMapping = {};
  if (fs.existsSync(mappingPath)) {
    try {
      skillMapping = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
    } catch { /* ignore */ }
  }

  // 递归复制目录
  function copyDirRecursive(src, dest) {
    ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  // 为技能名生成稳定的 UUID（基于名称哈希）
  function generateSkillId(skillName) {
    const crypto = require("crypto");
    const hash = crypto.createHash("md5").update(`openyida-${skillName}`).digest("hex");
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  }

  // 遍历 skills/ 目录下的每个子技能
  const skillDirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  let installedCount = 0;

  for (const entry of skillDirs) {
    if (!entry.isDirectory()) continue;
    
    const skillName = entry.name;
    const srcSkillPath = path.join(SKILLS_DIR, skillName);

    // 获取或生成技能 UUID
    let skillId = skillMapping[skillName];
    if (!skillId) {
      skillId = generateSkillId(skillName);
      skillMapping[skillName] = skillId;
    }

    const destSkillPath = path.join(wukongSkillsDir, skillId);

    // 复制技能目录
    copyDirRecursive(srcSkillPath, destSkillPath);
    installedCount++;
  }

  // 保存映射文件
  fs.writeFileSync(mappingPath, JSON.stringify(skillMapping, null, 2), "utf-8");

  if (installedCount > 0) {
    console.log(`[openyida] 已安装 ${installedCount} 个技能到悟空`);
  }
});

// ── 4. 全局配置目录 ──────────────────────────────────────────────────

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

// ── 4. OpenCode / Cursor / VS Code 集成 ────────────────────────────
//
// 这些 IDE 通过扫描 ~/.claude/skills/ 目录自动发现技能（与 Claude Code 共用软链接），
// 无需额外修改任何 IDE 配置文件，避免污染用户环境。
// 步骤 1 创建的软链接已覆盖所有支持该目录的 IDE。

// ── 5. 安装 yida-publish-page 依赖 ──────────────────────────────────

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
