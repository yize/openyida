"use strict";

/**
 * 安装与内置 Skills 测试
 *
 * 验证：
 * - Skills 内置于 npm 包的 skills/ 目录
 * - postinstall.js 脚本存在且语法正确
 * - 内置 Skills 目录结构完整
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(PROJECT_ROOT, "skills");
const POSTINSTALL_SCRIPT = path.join(PROJECT_ROOT, "scripts", "postinstall.js");

// ── 内置 Skills 测试 ─────────────────────────────────────────────────

describe("内置 Skills", () => {
  test("skills/ 目录存在", () => {
    expect(fs.existsSync(SKILLS_DIR)).toBe(true);
  });

  test("包含所有核心 Skills", () => {
    const expectedSkills = [
      "yida-app",
      "yida-login",
      "yida-logout",
      "yida-create-app",
      "yida-create-page",
      "yida-create-form-page",
      "yida-get-schema",
      "yida-custom-page",
      "yida-publish-page",
      "yida-page-config",
    ];
    const actualSkills = fs.readdirSync(SKILLS_DIR).filter((name) =>
      fs.statSync(path.join(SKILLS_DIR, name)).isDirectory()
    );
    expectedSkills.forEach((skill) => {
      expect(actualSkills).toContain(skill);
    });
  });

  test("每个 Skill 都有 SKILL.md", () => {
    const skills = fs.readdirSync(SKILLS_DIR).filter((name) =>
      fs.statSync(path.join(SKILLS_DIR, name)).isDirectory()
    );
    skills.forEach((skill) => {
      const skillMd = path.join(SKILLS_DIR, skill, "SKILL.md");
      expect(fs.existsSync(skillMd)).toBe(true);
    });
  });

  test("有脚本的 Skill 都有 scripts/ 目录", () => {
    const skillsWithScripts = [
      "yida-login",
      "yida-logout",
      "yida-create-app",
      "yida-create-page",
      "yida-create-form-page",
      "yida-get-schema",
      "yida-publish-page",
      "yida-page-config",
    ];
    skillsWithScripts.forEach((skill) => {
      const scriptsDir = path.join(SKILLS_DIR, skill, "scripts");
      expect(fs.existsSync(scriptsDir)).toBe(true);
    });
  });

  test("yida-login 包含 login.py", () => {
    const loginScript = path.join(SKILLS_DIR, "yida-login", "scripts", "login.py");
    expect(fs.existsSync(loginScript)).toBe(true);
  });

  test("yida-create-app 包含 create-app.js", () => {
    const script = path.join(SKILLS_DIR, "yida-create-app", "scripts", "create-app.js");
    expect(fs.existsSync(script)).toBe(true);
  });

  test("yida-publish-page 包含 publish.js 和 package.json", () => {
    const publishScript = path.join(SKILLS_DIR, "yida-publish-page", "scripts", "publish.js");
    const packageJson = path.join(SKILLS_DIR, "yida-publish-page", "scripts", "package.json");
    expect(fs.existsSync(publishScript)).toBe(true);
    expect(fs.existsSync(packageJson)).toBe(true);
  });
});

// ── postinstall.js 测试 ──────────────────────────────────────────────

describe("postinstall.js", () => {
  test("脚本文件存在", () => {
    expect(fs.existsSync(POSTINSTALL_SCRIPT)).toBe(true);
  });

  test("脚本语法正确", () => {
    const { execSync } = require("child_process");
    expect(() => {
      execSync(`node --check "${POSTINSTALL_SCRIPT}"`, { stdio: "pipe" });
    }).not.toThrow();
  });

  test("包含 Claude Code 集成逻辑", () => {
    const content = fs.readFileSync(POSTINSTALL_SCRIPT, "utf-8");
    expect(content).toContain(".claude");
    expect(content).toContain("skills");
    expect(content).toContain("symlinkSync");
  });

  test("包含全局配置目录创建逻辑", () => {
    const content = fs.readFileSync(POSTINSTALL_SCRIPT, "utf-8");
    expect(content).toContain("openyida");
    expect(content).toContain("config.json");
    expect(content).toContain("credentials");
  });

  test("包含 yida-publish-page 依赖安装逻辑", () => {
    const content = fs.readFileSync(POSTINSTALL_SCRIPT, "utf-8");
    expect(content).toContain("yida-publish-page");
    expect(content).toContain("npm install");
  });
});

// ── Skills JS 脚本语法检查 ───────────────────────────────────────────

describe("Skills JS 脚本语法检查", () => {
  const { execSync } = require("child_process");

  test("所有 JS 脚本语法正确", () => {
    const skills = fs.readdirSync(SKILLS_DIR).filter((name) =>
      fs.statSync(path.join(SKILLS_DIR, name)).isDirectory()
    );

    skills.forEach((skill) => {
      const scriptsDir = path.join(SKILLS_DIR, skill, "scripts");
      if (!fs.existsSync(scriptsDir)) return;

      const jsFiles = fs.readdirSync(scriptsDir).filter((f) => f.endsWith(".js"));
      jsFiles.forEach((jsFile) => {
        const filePath = path.join(scriptsDir, jsFile);
        expect(() => {
          execSync(`node --check "${filePath}"`, { stdio: "pipe" });
        }).not.toThrow();
      });
    });
  });

  test("所有 JSON 文件格式正确", () => {
    const skills = fs.readdirSync(SKILLS_DIR).filter((name) =>
      fs.statSync(path.join(SKILLS_DIR, name)).isDirectory()
    );

    skills.forEach((skill) => {
      const scriptsDir = path.join(SKILLS_DIR, skill, "scripts");
      if (!fs.existsSync(scriptsDir)) return;

      const jsonFiles = fs.readdirSync(scriptsDir).filter((f) => f.endsWith(".json"));
      jsonFiles.forEach((jsonFile) => {
        const filePath = path.join(scriptsDir, jsonFile);
        expect(() => {
          JSON.parse(fs.readFileSync(filePath, "utf-8"));
        }).not.toThrow();
      });
    });
  });
});
