#!/usr/bin/env node
/**
 * OpenYida CLI - 宜搭命令行工具
 *
 * 安装：npm install -g openyida
 * 用法：openyida <命令> [参数]（别名：yida）
 *
 * Skills 内置于 npm 包的 skills/ 目录，安装即用，零配置。
 */

"use strict";

const { Command } = require("commander");
const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const program = new Command();

// ── 全局配置目录 ──────────────────────────────────────────────────────

/**
 * 获取全局配置目录路径
 * macOS/Linux: ~/.config/openyida
 * Windows:     %APPDATA%/openyida
 */
function getGlobalConfigDir() {
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "openyida");
  }
  return path.join(os.homedir(), ".config", "openyida");
}

/**
 * 获取内置 Skills 目录路径（npm 包内的 skills/ 目录）
 */
function getBuiltinSkillsDir() {
  return path.resolve(__dirname, "..", "skills");
}

/**
 * 获取全局配置文件路径
 */
function getGlobalConfigPath() {
  return path.join(getGlobalConfigDir(), "config.json");
}

/**
 * 获取全局凭据目录路径
 */
function getGlobalCredentialsDir() {
  return path.join(getGlobalConfigDir(), "credentials");
}

/**
 * 获取全局缓存目录路径
 */
function getGlobalCacheDir() {
  return path.join(getGlobalConfigDir(), "cache");
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ── 工具函数 ──────────────────────────────────────────────────────────

/**
 * 查找项目根目录（向上查找 config.json 或 .git）
 */
function findProjectRoot() {
  let currentDir = process.cwd();
  while (currentDir !== path.dirname(currentDir)) {
    if (
      fs.existsSync(path.join(currentDir, "config.json")) ||
      fs.existsSync(path.join(currentDir, ".git"))
    ) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return process.cwd();
}

/**
 * 获取 skill 脚本路径（从内置 Skills 目录查找）
 */
function getSkillScript(skillName, scriptFile) {
  const builtinDir = getBuiltinSkillsDir();
  const scriptPath = path.join(builtinDir, skillName, "scripts", scriptFile);
  if (fs.existsSync(scriptPath)) {
    return scriptPath;
  }

  console.error(`\n❌ 未找到内置 skill 脚本：${skillName}/${scriptFile}`);
  console.error(`\n请重新安装：npm install -g openyida`);
  process.exit(1);
}

/**
 * 获取配置文件路径（优先项目级，其次全局级）
 */
function getConfigPath() {
  const projectRoot = findProjectRoot();
  const projectConfig = path.join(projectRoot, "config.json");
  if (fs.existsSync(projectConfig)) {
    return projectConfig;
  }
  const globalConfig = getGlobalConfigPath();
  if (fs.existsSync(globalConfig)) {
    return globalConfig;
  }
  return projectConfig; // 默认返回项目级路径
}

/**
 * 获取 cookies 文件路径（优先项目级，其次全局级）
 */
function getCookiePath() {
  const projectRoot = findProjectRoot();
  const projectCookie = path.join(projectRoot, ".cache", "cookies.json");
  if (fs.existsSync(projectCookie)) {
    return projectCookie;
  }
  const globalCookie = path.join(getGlobalCredentialsDir(), "cookies.json");
  if (fs.existsSync(globalCookie)) {
    return globalCookie;
  }
  return projectCookie; // 默认返回项目级路径，让用户在当前项目登录
}

/**
 * 运行 Node.js skill 脚本，将 stdout/stderr 透传到终端
 */
function runNodeScript(scriptPath, args = []) {
  const child = spawn("node", [scriptPath, ...args], {
    stdio: "inherit",
    cwd: findProjectRoot(),
  });

  child.on("close", (exitCode) => {
    process.exit(exitCode ?? 0);
  });

  child.on("error", (error) => {
    console.error(`\n❌ 执行失败：${error.message}`);
    process.exit(1);
  });
}

/**
 * 运行 Python skill 脚本，将 stdout/stderr 透传到终端
 */
function runPythonScript(scriptPath, args = []) {
  const child = spawn("python3", [scriptPath, ...args], {
    stdio: "inherit",
    cwd: findProjectRoot(),
  });

  child.on("close", (exitCode) => {
    process.exit(exitCode ?? 0);
  });

  child.on("error", (error) => {
    if (error.code === "ENOENT") {
      console.error(`\n❌ 未找到 python3，请先安装 Python 3.10+`);
    } else {
      console.error(`\n❌ 执行失败：${error.message}`);
    }
    process.exit(1);
  });
}

// ── CLI 配置 ──────────────────────────────────────────────────────────

program
  .name("openyida")
  .description("OpenYida CLI - 宜搭低代码 AI 开发工具（安装即用，零配置）")
  .version("1.0.0");

// ── openyida login ───────────────────────────────────────────────────

program
  .command("login")
  .description("扫码登录宜搭（打开浏览器扫码）")
  .action(() => {
    console.log("🔐 正在启动登录流程，请扫码...\n");
    const scriptPath = getSkillScript("yida-login", "login.py");
    runPythonScript(scriptPath);
  });

// ── yida logout ───────────────────────────────────────────────────────

program
  .command("logout")
  .description("退出登录，清除本地登录态")
  .action(() => {
    console.log("👋 正在退出登录...\n");
    const scriptPath = getSkillScript("yida-logout", "logout.py");
    runPythonScript(scriptPath);
  });

// ── yida create-app ───────────────────────────────────────────────────

program
  .command("create-app <name>")
  .description("创建宜搭应用")
  .option("-d, --description <desc>", "应用描述（默认同应用名称）")
  .option("-i, --icon <icon>", "图标标识（默认 xian-yingyong）", "xian-yingyong")
  .option("-c, --color <color>", "图标颜色（默认 #0089FF）", "#0089FF")
  .addHelpText("after", `
示例：
  $ yida create-app "考勤管理"
  $ yida create-app "考勤管理" -d "员工考勤打卡系统" -i xian-daka -c "#00B853"

可用图标：
  xian-xinwen, xian-zhengfu, xian-yingyong, xian-xueshimao, xian-qiye,
  xian-danju, xian-shichang, xian-jingli, xida-falv, xian-baogao,
  huoche, xian-shenbao, xian-diqiu, xian-qiche, xian-feiji,
  xian-diannao, xian-gongzuozheng, xian-gouwuche, xian-xinyongka,
  xian-huodong, xian-jiangbei, xian-liucheng, xian-chaxun, xian-daka

可用颜色：
  #0089FF #00B853 #FFA200 #FF7357 #5C72FF
  #85C700 #FFC505 #FF6B7A #8F66FF #14A9FF`)
  .action((name, options) => {
    const scriptPath = getSkillScript("yida-create-app", "create-app.js");
    const args = [name];
    if (options.description) args.push(options.description);
    else args.push(name);
    args.push(options.icon);
    args.push(options.color);
    runNodeScript(scriptPath, args);
  });

// ── yida create-page ──────────────────────────────────────────────────

program
  .command("create-page")
  .description("在指定应用中创建自定义展示页面")
  .argument("<app>", "应用 ID（如 APP_XXXXXXXXXXXXX）")
  .argument("<name>", "页面名称")
  .addHelpText("after", `
示例：
  $ yida create-page APP_XXXXXXXXXXXXX "游戏主页"
  $ yida create-page APP_XXXXXXXXXXXXX "数据看板"`)
  .action((app, name) => {
    const scriptPath = getSkillScript("yida-create-page", "create-page.js");
    runNodeScript(scriptPath, [app, name]);
  });

// ── yida create-form ──────────────────────────────────────────────────

program
  .command("create-form")
  .description("在指定应用中创建表单页面")
  .argument("<app>", "应用 ID（如 APP_XXXXXXXXXXXXX）")
  .argument("<name>", "表单名称")
  .argument("<fields>", "字段定义（JSON 字符串或 JSON 文件路径）")
  .addHelpText("after", `
示例：
  $ yida create-form APP_XXX "客户信息" fields.json
  $ yida create-form APP_XXX "客户信息" '[{"type":"TextField","label":"姓名"}]'`)
  .action((app, name, fields) => {
    const scriptPath = getSkillScript("yida-create-form-page", "create-form-page.js");
    runNodeScript(scriptPath, [app, name, fields]);
  });

// ── yida publish ──────────────────────────────────────────────────────

program
  .command("publish")
  .description("编译并发布自定义页面到宜搭")
  .argument("<file>", "源文件路径（如 pages/src/myapp.js）")
  .argument("<app>", "应用 ID（如 APP_XXXXXXXXXXXXX）")
  .argument("<form>", "表单/页面 UUID（如 FORM-XXXXXXXXXXXXX）")
  .addHelpText("after", `
示例：
  $ yida publish pages/src/myapp.js APP_XXXXXXXXXXXXX FORM-XXXXXXXXXXXXX`)
  .action((file, app, form) => {
    const scriptPath = getSkillScript("yida-publish-page", "publish.js");
    runNodeScript(scriptPath, [app, form, file]);
  });

// ── yida get-schema ───────────────────────────────────────────────────

program
  .command("get-schema")
  .description("获取表单/页面的完整 Schema 结构")
  .argument("<app>", "应用 ID（如 APP_XXXXXXXXXXXXX）")
  .argument("<form>", "表单 UUID（如 FORM-XXXXXXXXXXXXX）")
  .addHelpText("after", `
示例：
  $ yida get-schema APP_XXXXXXXXXXXXX FORM-XXXXXXXXXXXXX
  $ yida get-schema APP_XXXXXXXXXXXXX FORM-XXXXXXXXXXXXX > schema.json`)
  .action((app, form) => {
    const scriptPath = getSkillScript("yida-get-schema", "get-schema.js");
    runNodeScript(scriptPath, [app, form]);
  });

// ── yida config ───────────────────────────────────────────────────────

program
  .command("config")
  .description("查看、校验或回滚当前项目配置")
  .option("--validate", "校验 config.json 格式和必填字段")
  .option("--rollback", "回滚到上一个备份配置（.cache/config.backup.json）")
  .option("--show", "显示当前配置（同默认行为）")
  .addHelpText("after", `
示例：
  $ yida config              # 查看配置和环境状态
  $ yida config --validate   # 校验配置格式
  $ yida config --rollback   # 回滚到备份配置`)
  .action((options) => {
    const projectRoot = findProjectRoot();
    const configPath = path.join(projectRoot, "config.json");
    const backupPath = path.join(projectRoot, ".cache", "config.backup.json");

    // --rollback：回滚到备份配置
    if (options.rollback) {
      if (!fs.existsSync(backupPath)) {
        console.error("❌ 未找到备份配置文件：.cache/config.backup.json");
        console.error("   请先运行 yida config 生成备份，或手动创建 config.json");
        process.exit(1);
      }
      try {
        const backupContent = fs.readFileSync(backupPath, "utf-8");
        JSON.parse(backupContent);
        fs.writeFileSync(configPath, backupContent, "utf-8");
        console.log("✅ 已回滚到备份配置：");
        const config = JSON.parse(backupContent);
        Object.entries(config).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      } catch (err) {
        console.error(`❌ 回滚失败：${err.message}`);
        process.exit(1);
      }
      return;
    }

    // --validate：校验配置
    if (options.validate) {
      const validationErrors = validateConfig(configPath);
      if (validationErrors.length === 0) {
        console.log("✅ config.json 校验通过");
      } else {
        console.error("❌ config.json 校验失败：");
        validationErrors.forEach((err) => console.error(`  - ${err}`));
        process.exit(1);
      }
      return;
    }

    // 默认：显示配置状态
    const globalConfigDir = getGlobalConfigDir();
    console.log(`📁 项目根目录：${projectRoot}`);
    console.log(`📁 全局配置目录：${globalConfigDir}`);
    console.log(`📄 配置文件：${configPath}`);
    console.log("");

    if (!fs.existsSync(configPath)) {
      // 尝试全局配置
      const globalConfig = getGlobalConfigPath();
      if (fs.existsSync(globalConfig)) {
        console.log("📄 使用全局配置：");
        try {
          const config = JSON.parse(fs.readFileSync(globalConfig, "utf-8"));
          Object.entries(config).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        } catch {
          console.error("❌ 全局配置文件格式错误");
        }
      } else {
        console.log("⚠️  未找到 config.json，使用默认配置");
        console.log("   defaultBaseUrl: https://www.aliwork.com");
      }
    } else {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        console.log("当前配置：");
        Object.entries(config).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });

        // 自动备份有效配置
        const cacheDir = path.join(projectRoot, ".cache");
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        fs.copyFileSync(configPath, backupPath);
      } catch {
        console.error("❌ 读取配置文件失败（JSON 格式错误）");
        console.error("   运行 yida config --rollback 回滚到上一个有效配置");
      }
    }

    // 检查登录态
    const cookiePath = getCookiePath();
    console.log("");
    if (fs.existsSync(cookiePath)) {
      try {
        const cookieData = JSON.parse(fs.readFileSync(cookiePath, "utf-8"));
        const cookies = Array.isArray(cookieData) ? cookieData : cookieData.cookies || [];
        const hasToken = cookies.some((c) => c.name === "tianshu_csrf_token");
        console.log(`🔑 登录态：${hasToken ? "✅ 已登录" : "⚠️  Cookie 存在但可能已过期"}`);
        console.log(`   位置：${cookiePath}`);
      } catch {
        console.log("🔑 登录态：⚠️  Cookie 文件损坏");
      }
    } else {
      console.log("🔑 登录态：❌ 未登录（运行 openyida login 登录）");
    }

    // 显示内置 Skills 信息
    const builtinDir = getBuiltinSkillsDir();
    console.log("");
    if (fs.existsSync(builtinDir)) {
      const skills = fs.readdirSync(builtinDir).filter((name) =>
        fs.statSync(path.join(builtinDir, name)).isDirectory()
      );
      console.log(`📦 内置 Skills（${skills.length} 个）：`);
      skills.forEach((skill) => console.log(`  - ${skill}`));
      console.log(`   位置：${builtinDir}`);
    } else {
      console.log("📦 Skills：❌ 内置 Skills 目录不存在，请重新安装：npm install -g openyida");
    }
  });

// ── yida doctor ───────────────────────────────────────────────────────

program
  .command("doctor")
  .description("检查 OpenYida 环境依赖，发现问题并给出修复建议")
  .option("--repair", "自动修复可修复的问题（如创建 config.json 模板）")
  .addHelpText("after", `
示例：
  $ openyida doctor            # 检查环境
  $ openyida doctor --repair   # 检查并自动修复`)
  .action((options) => {
    runDoctorCheck(options.repair);
  });

// ── yida completion ───────────────────────────────────────────────────

program
  .command("completion")
  .description("输出 shell 自动补全脚本（bash/zsh/fish）")
  .argument("<shell>", "目标 shell 类型：bash | zsh | fish")
  .addHelpText("after", `
安装方法：
  bash:  openyida completion bash >> ~/.bashrc && source ~/.bashrc
  zsh:   openyida completion zsh >> ~/.zshrc && source ~/.zshrc
  fish:  openyida completion fish > ~/.config/fish/completions/openyida.fish`)
  .action((shellType) => {
    printCompletionScript(shellType);
  });

// ── yida shell ────────────────────────────────────────────────────────

program
  .command("shell")
  .description("进入交互式 REPL 模式")
  .action(() => {
    const readline = require("readline");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "openyida> ",
      historySize: 100,
    });

    console.log("🤖 OpenYida Shell（输入 help 查看命令，输入 exit 退出）\n");
    rl.prompt();

    rl.on("line", (line) => {
      const input = line.trim();

      if (!input) {
        rl.prompt();
        return;
      }

      if (input === "exit" || input === "quit") {
        console.log("👋 再见！");
        rl.close();
        return;
      }

      if (input === "help") {
        console.log(`
可用命令：
  login                          扫码登录
  logout                         退出登录
  create-app <name>              创建应用
  create-page <app> <name>       创建自定义页面
  create-form <app> <name> <fields>  创建表单页面
  publish <file> <app> <form>    发布页面
  get-schema <app> <form>        获取表单 Schema
  config                         查看配置
  doctor                         检查环境
  exit / quit                    退出 Shell
`);
        rl.prompt();
        return;
      }

      const args = parseShellArgs(input);
      try {
        rl.pause();
        const child = spawn(process.execPath, [process.argv[1], ...args], {
          stdio: "inherit",
          cwd: process.cwd(),
        });
        child.on("close", () => {
          rl.resume();
          rl.prompt();
        });
        child.on("error", (error) => {
          console.error(`\n❌ 执行失败：${error.message}`);
          rl.resume();
          rl.prompt();
        });
      } catch (error) {
        console.error(`\n❌ 错误：${error.message}`);
        rl.prompt();
      }
    });

    rl.on("close", () => {
      process.exit(0);
    });
  });


// ── doctor / completion / config 辅助函数 ────────────────────────────

/**
 * 校验 config.json 格式和必填字段
 */
function validateConfig(configPath) {
  const errors = [];
  if (!fs.existsSync(configPath)) {
    errors.push("config.json 不存在");
    return errors;
  }
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch {
    errors.push("config.json 不是合法的 JSON 格式");
    return errors;
  }
  if (!config.loginUrl) {
    errors.push("缺少必填字段：loginUrl（宜搭登录页面地址）");
  } else if (!/^https?:\/\/.+/.test(config.loginUrl)) {
    errors.push("loginUrl 不是合法的 URL");
  }
  if (!config.defaultBaseUrl) {
    errors.push("缺少必填字段：defaultBaseUrl（API 请求基础地址）");
  } else if (!/^https?:\/\/.+/.test(config.defaultBaseUrl)) {
    errors.push("defaultBaseUrl 不是合法的 URL");
  }
  return errors;
}

/**
 * 执行 yida doctor 环境检查
 */
function runDoctorCheck(repair) {
  const projectRoot = findProjectRoot();
  const configPath = path.join(projectRoot, "config.json");
  const globalConfigDir = getGlobalConfigDir();

  console.log("🔍 检查 OpenYida 环境依赖...\n");

  const issues = [];

  // 1. Node.js 版本
  const nodeVersion = process.versions.node;
  const nodeMajor = parseInt(nodeVersion.split(".")[0], 10);
  if (nodeMajor >= 16) {
    console.log(`✅ Node.js v${nodeVersion}（要求 ≥ 16）`);
  } else {
    console.log(`❌ Node.js v${nodeVersion}（要求 ≥ 16，请升级）`);
    issues.push({ type: "error", msg: `Node.js 版本过低（${nodeVersion}），请升级到 v16+` });
  }

  // 2. Python 版本
  try {
    const pythonVersion = execSync("python3 --version 2>&1", { encoding: "utf-8" }).trim();
    const versionMatch = pythonVersion.match(/Python (\d+)\.(\d+)/);
    if (versionMatch) {
      const major = parseInt(versionMatch[1], 10);
      const minor = parseInt(versionMatch[2], 10);
      if (major > 3 || (major === 3 && minor >= 10)) {
        console.log(`✅ ${pythonVersion}（要求 ≥ 3.10）`);
      } else {
        console.log(`❌ ${pythonVersion}（要求 ≥ 3.10，请升级）`);
        issues.push({ type: "error", msg: `Python 版本过低（${pythonVersion}），请升级到 3.10+` });
      }
    }
  } catch {
    console.log("❌ 未找到 python3，请安装 Python 3.10+");
    issues.push({ type: "error", msg: "未找到 python3，请安装：https://www.python.org/" });
  }

  // 3. Playwright 安装
  try {
    execSync("python3 -c \"import playwright\"", { encoding: "utf-8", stdio: "pipe" });
    console.log("✅ Playwright 已安装");
  } catch {
    console.log("❌ Playwright 未安装");
    issues.push({ type: "fix", msg: "Playwright 未安装", fix: "pip install playwright" });
  }

  // 4. Playwright Chromium
  try {
    execSync(
      "python3 -c \"from playwright.sync_api import sync_playwright; p = sync_playwright().start(); p.stop()\"",
      { encoding: "utf-8", stdio: "pipe", timeout: 10_000 }
    );
    console.log("✅ Playwright Chromium 已安装");
  } catch {
    console.log("⚠️  Playwright Chromium 可能未安装");
    issues.push({ type: "fix", msg: "Playwright Chromium 未安装", fix: "playwright install chromium" });
  }

  // 5. gh CLI 安装
  try {
    const ghVersion = execSync("gh --version 2>&1", { encoding: "utf-8" }).split("\n")[0].trim();
    console.log(`✅ ${ghVersion}`);
  } catch {
    console.log("❌ gh CLI 未安装");
    issues.push({ type: "error", msg: "gh CLI 未安装，请安装：https://cli.github.com/" });
  }

  // 6. gh CLI 登录态
  try {
    execSync("gh auth status 2>&1", { encoding: "utf-8", stdio: "pipe" });
    console.log("✅ gh CLI 已登录");
  } catch {
    console.log("⚠️  gh CLI 未登录");
    issues.push({ type: "fix", msg: "gh CLI 未登录", fix: "gh auth login" });
  }

  // 7. config.json（项目级或全局级）
  const globalConfigPath = getGlobalConfigPath();
  if (fs.existsSync(configPath)) {
    const configErrors = validateConfig(configPath);
    if (configErrors.length === 0) {
      console.log("✅ config.json 存在且格式正确（项目级）");
    } else {
      console.log(`❌ config.json：${configErrors.join("；")}`);
      issues.push({ type: "error", msg: `config.json 问题：${configErrors.join("；")}` });
    }
  } else if (fs.existsSync(globalConfigPath)) {
    const configErrors = validateConfig(globalConfigPath);
    if (configErrors.length === 0) {
      console.log("✅ config.json 存在且格式正确（全局级）");
    } else {
      console.log(`❌ 全局 config.json：${configErrors.join("；")}`);
      issues.push({ type: "error", msg: `全局 config.json 问题：${configErrors.join("；")}` });
    }
  } else {
    console.log("⚠️  config.json 不存在（项目级和全局级均未找到）");
    issues.push({
      type: "fix",
      msg: "config.json 不存在",
      fix: "create-config",
    });
  }

  // 8. 内置 Skills 检查
  const builtinSkillsDir = getBuiltinSkillsDir();
  if (fs.existsSync(builtinSkillsDir)) {
    const skills = fs.readdirSync(builtinSkillsDir).filter((name) =>
      fs.statSync(path.join(builtinSkillsDir, name)).isDirectory()
    );
    console.log(`✅ Skills 已安装（内置 ${skills.length} 个）`);
  } else {
    console.log("❌ 内置 Skills 目录不存在");
    issues.push({ type: "error", msg: "内置 Skills 目录不存在，请重新安装：npm install -g openyida" });
  }

  // 9. 全局配置目录
  if (fs.existsSync(globalConfigDir)) {
    console.log(`✅ 全局配置目录：${globalConfigDir}`);
  } else {
    console.log(`⚠️  全局配置目录不存在：${globalConfigDir}`);
    issues.push({ type: "fix", msg: "全局配置目录不存在", fix: "npm install -g openyida" });
  }

  // 10. 宜搭登录态
  const cookiePath = getCookiePath();
  if (fs.existsSync(cookiePath)) {
    try {
      const cookieData = JSON.parse(fs.readFileSync(cookiePath, "utf-8"));
      const cookies = Array.isArray(cookieData) ? cookieData : cookieData.cookies || [];
      const hasToken = cookies.some((c) => c.name === "tianshu_csrf_token");
      console.log(`${hasToken ? "✅" : "⚠️ "} 宜搭登录态：${hasToken ? "已登录" : "Cookie 存在但可能已过期"}`);
    } catch {
      console.log("⚠️  宜搭登录态：Cookie 文件损坏");
    }
  } else {
    console.log("⚠️  宜搭登录态：未登录（运行 openyida login 登录）");
  }

  // 汇总
  console.log("");
  const errorCount = issues.filter((i) => i.type === "error").length;
  const fixableCount = issues.filter((i) => i.type === "fix").length;
  const warnCount = issues.filter((i) => i.type === "warn").length;

  if (issues.length === 0) {
    console.log("🎉 所有检查通过，环境配置完整！");
    return;
  }

  console.log(`发现 ${issues.length} 个问题（${errorCount} 个错误，${fixableCount} 个可自动修复，${warnCount} 个警告）`);

  if (repair) {
    console.log("\n🔧 正在自动修复...\n");
    let fixedCount = 0;
    for (const issue of issues) {
      if (issue.type !== "fix") continue;
      if (issue.fix === "create-config") {
        // 优先创建全局配置
        ensureDir(getGlobalConfigDir());
        const template = {
          loginUrl: "https://www.aliwork.com/workPlatform",
          defaultBaseUrl: "https://www.aliwork.com",
        };
        const targetPath = getGlobalConfigPath();
        fs.writeFileSync(targetPath, JSON.stringify(template, null, 2), "utf-8");
        console.log(`✅ 已创建全局配置文件：${targetPath}`);
        // 同时在项目级创建（向后兼容）
        fs.writeFileSync(configPath, JSON.stringify(template, null, 2), "utf-8");
        console.log("✅ 已创建项目级 config.json 模板");
        fixedCount++;
      } else if (issue.fix === "npm install -g openyida") {
        console.log("  💡 请运行：npm install -g openyida");
      } else if (issue.fix) {
        console.log(`  💡 请手动运行：${issue.fix}`);
      }
    }
    if (fixedCount > 0) {
      console.log(`\n✅ 自动修复了 ${fixedCount} 个问题`);
    }
    const remaining = issues.filter(
      (i) => i.type === "error" || (i.type === "fix" && i.fix !== "create-config")
    );
    if (remaining.length > 0) {
      console.log("\n需要手动处理的问题：");
      remaining.forEach((i) => console.log(`  - ${i.msg}${i.fix ? `（运行：${i.fix}）` : ""}`));
    }
  } else {
    console.log(`\n运行 openyida doctor --repair 自动修复可修复的问题`);
  }
}

/**
 * 输出 shell 自动补全脚本
 */
function printCompletionScript(shellType) {
  const allCommands = [
    "login", "logout", "create-app", "create-page",
    "create-form", "publish", "get-schema", "config", "doctor", "completion", "shell",
  ];
  const commandsStr = allCommands.join(" ");

  switch (shellType.toLowerCase()) {
    case "bash":
      console.log(`# OpenYida CLI bash completion
# 安装：openyida completion bash >> ~/.bashrc && source ~/.bashrc

_openyida_completion() {
  local cur prev words cword
  _init_completion || return

  local commands="${commandsStr}"

  case "$prev" in
    openyida|yida)
      COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
      return ;;
    config)
      COMPREPLY=( $(compgen -W "--validate --rollback --show" -- "$cur") )
      return ;;
    doctor)
      COMPREPLY=( $(compgen -W "--repair" -- "$cur") )
      return ;;
    completion)
      COMPREPLY=( $(compgen -W "bash zsh fish" -- "$cur") )
      return ;;
    create-app)
      COMPREPLY=( $(compgen -W "--description --icon --color" -- "$cur") )
      return ;;
  esac
}

complete -F _openyida_completion openyida
complete -F _openyida_completion yida`);
      break;

    case "zsh":
      console.log(`# OpenYida CLI zsh completion
# 安装：openyida completion zsh >> ~/.zshrc && source ~/.zshrc

_openyida() {
  local -a commands
  commands=(
    'login:扫码登录宜搭'
    'logout:退出登录'
    'create-app:创建宜搭应用'
    'create-page:创建自定义页面'
    'create-form:创建表单页面'
    'publish:发布页面到宜搭'
    'get-schema:获取表单 Schema'
    'config:查看/校验/回滚配置'
    'doctor:检查环境依赖'
    'completion:输出 shell 补全脚本'
    'shell:进入交互式 REPL 模式'
  )

  _arguments -C \\\\
    '1: :->command' \\\\
    '*: :->args'

  case $state in
    command)
      _describe 'openyida commands' commands ;;
    args)
      case $words[2] in
        config)
          _arguments '--validate[校验配置]' '--rollback[回滚配置]' '--show[显示配置]' ;;
        doctor)
          _arguments '--repair[自动修复]' ;;
        completion)
          _arguments '1: :(bash zsh fish)' ;;
        create-app)
          _arguments '--description[应用描述]' '--icon[图标]' '--color[颜色]' ;;
      esac ;;
  esac
}

# 仅在交互式 shell 中注册补全（避免非交互式 shell 报错）
if [[ -n \${ZSH_VERSION-} ]] && [[ \$- == *i* ]]; then
  compdef _openyida openyida
  compdef _openyida yida
fi`);
      break;

    case "fish":
      console.log(`# OpenYida CLI fish completion
# 安装：openyida completion fish > ~/.config/fish/completions/openyida.fish

complete -c openyida -e
complete -c openyida -f -n '__fish_use_subcommand' -a 'login' -d '扫码登录宜搭'
complete -c openyida -f -n '__fish_use_subcommand' -a 'logout' -d '退出登录'
complete -c openyida -f -n '__fish_use_subcommand' -a 'create-app' -d '创建宜搭应用'
complete -c openyida -f -n '__fish_use_subcommand' -a 'create-page' -d '创建自定义页面'
complete -c openyida -f -n '__fish_use_subcommand' -a 'create-form' -d '创建表单页面'
complete -c openyida -f -n '__fish_use_subcommand' -a 'publish' -d '发布页面到宜搭'
complete -c openyida -f -n '__fish_use_subcommand' -a 'get-schema' -d '获取表单 Schema'
complete -c openyida -f -n '__fish_use_subcommand' -a 'config' -d '查看/校验/回滚配置'
complete -c openyida -f -n '__fish_use_subcommand' -a 'doctor' -d '检查环境依赖'
complete -c openyida -f -n '__fish_use_subcommand' -a 'completion' -d '输出 shell 补全脚本'
complete -c openyida -f -n '__fish_use_subcommand' -a 'shell' -d '进入交互式 REPL 模式'
complete -c openyida -f -n '__fish_seen_subcommand_from config' -l validate -d '校验配置格式'
complete -c openyida -f -n '__fish_seen_subcommand_from config' -l rollback -d '回滚到备份配置'
complete -c openyida -f -n '__fish_seen_subcommand_from config' -l show -d '显示当前配置'
complete -c openyida -f -n '__fish_seen_subcommand_from doctor' -l repair -d '自动修复可修复的问题'
complete -c openyida -f -n '__fish_seen_subcommand_from completion' -a 'bash zsh fish'
complete -c openyida -f -n '__fish_seen_subcommand_from create-app' -l description -d '应用描述'
complete -c openyida -f -n '__fish_seen_subcommand_from create-app' -l icon -d '图标标识'
complete -c openyida -f -n '__fish_seen_subcommand_from create-app' -l color -d '图标颜色'`);
      break;

    default:
      console.error(`❌ 不支持的 shell 类型：${shellType}`);
      console.error("   支持的类型：bash | zsh | fish");
      process.exit(1);
  }
}

/**
 * 简单的 shell 参数解析（支持引号包裹的参数）
 */
function parseShellArgs(input) {
  const args = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (const char of input) {
    if (inQuote) {
      if (char === quoteChar) {
        inQuote = false;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = true;
      quoteChar = char;
    } else if (char === " ") {
      if (current) {
        args.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    args.push(current);
  }

  return args;
}

// ── 导出供测试使用 ────────────────────────────────────────────────────

module.exports = {
  getGlobalConfigDir,
  getBuiltinSkillsDir,
  findProjectRoot,
  validateConfig,
  getConfigPath,
  getCookiePath,
};

// ── 解析并执行 ────────────────────────────────────────────────────────

program.parse(process.argv);
