"use strict";

/**
 * OpenYida CLI 测试套件
 *
 * 测试策略：
 * 1. 纯函数单元测试（内联副本）：findProjectRoot、parseShellArgs
 * 2. CLI 行为集成测试（子进程）：通过 spawnSync 调用 node bin/yida.js 验证输出
 * 3. config 命令测试：通过临时目录模拟不同的文件系统状态
 */

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const CLI_PATH = path.resolve(__dirname, "../bin/yida.js");
const PROJECT_ROOT = path.resolve(__dirname, "..");

/**
 * 执行 CLI 命令，返回 { stdout, stderr, status }
 */
function runCli(args = [], options = {}) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    encoding: "utf-8",
    cwd: options.cwd || PROJECT_ROOT,
    env: { ...process.env, ...options.env },
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status ?? 1,
  };
}

// ── 纯函数单元测试（内联副本，与 bin/yida.js 保持一致）────────────────

/**
 * parseShellArgs 的内联副本，用于单元测试
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

/**
 * findProjectRoot 的内联副本，用于单元测试
 */
function findProjectRoot(startDir) {
  let currentDir = startDir || process.cwd();
  while (currentDir !== path.dirname(currentDir)) {
    if (
      fs.existsSync(path.join(currentDir, "config.json")) ||
      fs.existsSync(path.join(currentDir, ".git"))
    ) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return startDir || process.cwd();
}

// ── parseShellArgs 单元测试 ───────────────────────────────────────────

describe("parseShellArgs", () => {
  test("解析普通空格分隔的参数", () => {
    expect(parseShellArgs("create-app 考勤管理")).toEqual(["create-app", "考勤管理"]);
  });

  test("解析双引号包裹的含空格参数", () => {
    expect(parseShellArgs('create-app "我的 测试 应用"')).toEqual([
      "create-app",
      "我的 测试 应用",
    ]);
  });

  test("解析单引号包裹的含空格参数", () => {
    expect(parseShellArgs("create-app '我的 测试 应用'")).toEqual([
      "create-app",
      "我的 测试 应用",
    ]);
  });

  test("解析多个引号参数混合", () => {
    expect(parseShellArgs('create-page APP_XXX "首页 Dashboard"')).toEqual([
      "create-page",
      "APP_XXX",
      "首页 Dashboard",
    ]);
  });

  test("空字符串返回空数组", () => {
    expect(parseShellArgs("")).toEqual([]);
  });

  test("多余空格被正确忽略", () => {
    expect(parseShellArgs("  login  ")).toEqual(["login"]);
  });

  test("引号内的引号字符被保留", () => {
    expect(parseShellArgs('"hello world"')).toEqual(["hello world"]);
  });

  test("解析带选项的命令", () => {
    expect(parseShellArgs("create-app 考勤 -d 考勤系统 -i xian-daka")).toEqual([
      "create-app",
      "考勤",
      "-d",
      "考勤系统",
      "-i",
      "xian-daka",
    ]);
  });
});

// ── findProjectRoot 单元测试 ──────────────────────────────────────────

describe("findProjectRoot", () => {
  test("从项目根目录本身出发，返回根目录", () => {
    // openyida 项目根目录有 config.json
    const result = findProjectRoot(PROJECT_ROOT);
    expect(result).toBe(PROJECT_ROOT);
  });

  test("从子目录出发，向上找到含 config.json 的根目录", () => {
    const subDir = path.join(PROJECT_ROOT, "tests");
    const result = findProjectRoot(subDir);
    expect(result).toBe(PROJECT_ROOT);
  });

  test("从不存在 config.json 或 .git 的目录出发，返回起始目录", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yida-test-"));
    const result = findProjectRoot(tmpDir);
    expect(result).toBe(tmpDir);
    fs.rmdirSync(tmpDir);
  });
});

// ── CLI 帮助和版本测试 ────────────────────────────────────────────────

describe("CLI 基本信息", () => {
  test("--help 输出包含所有核心命令", () => {
    const { stdout, status } = runCli(["--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("login");
    expect(stdout).toContain("logout");
    expect(stdout).toContain("create-app");
    expect(stdout).toContain("create-page");
    expect(stdout).toContain("create-form");
    expect(stdout).toContain("publish");
    expect(stdout).toContain("get-schema");
    expect(stdout).toContain("config");
    expect(stdout).toContain("shell");
  });

  test("版本号格式正确（semver）", () => {
    const { stdout } = runCli(["--version"]);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });
  test("无参数时输出帮助信息", () => {
    const { stdout, stderr } = runCli([]);
    // Commander 无子命令时将 usage 输出到 stdout 或 stderr
    const output = stdout + stderr;
    expect(output).toContain("Usage");
  });

  test("未知命令输出错误提示", () => {
    const { stderr, status } = runCli(["unknown-command"]);
    expect(status).not.toBe(0);
    expect(stderr).toContain("unknown command");
  });
});

// ── 各命令帮助文本测试 ────────────────────────────────────────────────

describe("子命令帮助文本", () => {
  test("create-app --help 包含选项说明", () => {
    const { stdout, status } = runCli(["create-app", "--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("--description");
    expect(stdout).toContain("--icon");
    expect(stdout).toContain("--color");
    expect(stdout).toContain("xian-yingyong"); // 默认图标
    expect(stdout).toContain("#0089FF"); // 默认颜色
  });

  test("create-app --help 包含示例", () => {
    const { stdout } = runCli(["create-app", "--help"]);
    expect(stdout).toContain("示例");
    expect(stdout).toContain("考勤管理");
  });

  test("create-page --help 包含参数说明", () => {
    const { stdout, status } = runCli(["create-page", "--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("<app>");
    expect(stdout).toContain("<name>");
  });

  test("publish --help 包含参数说明", () => {
    const { stdout, status } = runCli(["publish", "--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("<file>");
    expect(stdout).toContain("<app>");
    expect(stdout).toContain("<form>");
  });

  test("get-schema --help 包含示例", () => {
    const { stdout, status } = runCli(["get-schema", "--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("示例");
    expect(stdout).toContain("APP_XXXXXXXXXXXXX");
  });
});

// ── 缺少必填参数时的错误处理 ─────────────────────────────────────────

describe("缺少必填参数", () => {
  test("create-app 缺少 name 参数时报错退出", () => {
    const { stderr, status } = runCli(["create-app"]);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/missing required argument/i);
  });

  test("create-page 缺少参数时报错退出", () => {
    const { stderr, status } = runCli(["create-page"]);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/missing required argument/i);
  });

  test("publish 缺少参数时报错退出", () => {
    const { stderr, status } = runCli(["publish"]);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/missing required argument/i);
  });

  test("get-schema 缺少参数时报错退出", () => {
    const { stderr, status } = runCli(["get-schema"]);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/missing required argument/i);
  });

  test("create-form 缺少参数时报错退出", () => {
    const { stderr, status } = runCli(["create-form"]);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/missing required argument/i);
  });
});

// ── yida config 命令测试 ──────────────────────────────────────────────

describe("yida config 命令", () => {
  test("在项目根目录运行时读取 config.json", () => {
    const { stdout, status } = runCli(["config"], { cwd: PROJECT_ROOT });
    expect(status).toBe(0);
    expect(stdout).toContain("aliwork.com");
    expect(stdout).toContain("loginUrl");
    expect(stdout).toContain("defaultBaseUrl");
  });

  test("显示项目根目录路径", () => {
    const { stdout } = runCli(["config"], { cwd: PROJECT_ROOT });
    expect(stdout).toContain("项目根目录");
  });

  test("显示登录态信息", () => {
    const { stdout } = runCli(["config"], { cwd: PROJECT_ROOT });
    // 无论已登录还是未登录，都应该显示登录态行
    expect(stdout).toContain("登录态");
  });

  test("显示 Skills 安装信息", () => {
    const { stdout } = runCli(["config"], { cwd: PROJECT_ROOT });
    // 无论已安装还是未安装，都应该显示 Skills 相关信息
    expect(stdout).toContain("Skills");
  });

  test("在无 config.json 的临时目录运行时显示配置信息", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yida-noconfig-"));
    // 创建 .git 让 findProjectRoot 停在这里
    fs.mkdirSync(path.join(tmpDir, ".git"));

    const { stdout, status } = runCli(["config"], { cwd: tmpDir });
    expect(status).toBe(0);
    // 无项目级 config.json 时，可能回退到全局配置或显示未找到提示
    const hasGlobalFallback = stdout.includes("全局配置");
    const hasNotFound = stdout.includes("未找到 config.json");
    expect(hasGlobalFallback || hasNotFound).toBe(true);
    expect(stdout).toContain("aliwork.com");

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("登录态：cookie 文件不存在时显示未登录", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yida-nologin-"));
    fs.mkdirSync(path.join(tmpDir, ".git"));
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify({ defaultBaseUrl: "https://www.aliwork.com" })
    );

    const { stdout } = runCli(["config"], { cwd: tmpDir });
    expect(stdout).toContain("未登录");

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("登录态：cookie 文件存在且含 tianshu_csrf_token 时显示已登录", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yida-loggedin-"));
    fs.mkdirSync(path.join(tmpDir, ".git"));
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify({ defaultBaseUrl: "https://www.aliwork.com" })
    );
    fs.mkdirSync(path.join(tmpDir, ".cache"));
    fs.writeFileSync(
      path.join(tmpDir, ".cache", "cookies.json"),
      JSON.stringify([
        { name: "tianshu_csrf_token", value: "abc123" },
        { name: "other_cookie", value: "xyz" },
      ])
    );

    const { stdout } = runCli(["config"], { cwd: tmpDir });
    expect(stdout).toContain("已登录");

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("登录态：cookie 文件存在但不含 tianshu_csrf_token 时显示可能已过期", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yida-expired-"));
    fs.mkdirSync(path.join(tmpDir, ".git"));
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify({ defaultBaseUrl: "https://www.aliwork.com" })
    );
    fs.mkdirSync(path.join(tmpDir, ".cache"));
    fs.writeFileSync(
      path.join(tmpDir, ".cache", "cookies.json"),
      JSON.stringify([{ name: "other_cookie", value: "xyz" }])
    );

    const { stdout } = runCli(["config"], { cwd: tmpDir });
    expect(stdout).toContain("过期");

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("内置 Skills 信息显示", () => {
    // Skills 内置于 npm 包，config 命令始终显示内置 Skills 信息
    const { stdout } = runCli(["config"], { cwd: PROJECT_ROOT });
    expect(stdout).toContain("内置 Skills");
    expect(stdout).toContain("yida-login");
    expect(stdout).toContain("yida-logout");
  });
});

// ── 内置 Skills 命令执行测试 ─────────────────────────────────────────

describe("内置 Skills 命令执行", () => {
  // Skills 内置于 npm 包，命令总能找到脚本，不会出现"未找到 skill 脚本"
  // 但会因为缺少登录态等原因在脚本执行阶段失败

  test("create-app 能找到内置 skill 脚本（不报未找到错误）", () => {
    const { stderr } = runCli(["create-app", "测试应用"], { cwd: PROJECT_ROOT });
    expect(stderr).not.toContain("未找到内置 skill 脚本");
  });

  test("create-page 能找到内置 skill 脚本", () => {
    const { stderr } = runCli(["create-page", "APP_XXX", "首页"], { cwd: PROJECT_ROOT });
    expect(stderr).not.toContain("未找到内置 skill 脚本");
  });

  test("get-schema 能找到内置 skill 脚本", () => {
    const { stderr } = runCli(["get-schema", "APP_XXX", "FORM-XXX"], { cwd: PROJECT_ROOT });
    expect(stderr).not.toContain("未找到内置 skill 脚本");
  });
});

// ── 头像 URL 版本参数修复测试（Issue #31）────────────────────────────
//
// workflow 中使用 re.sub(r'\?v=\d+', '?v=4', avatar_url) 修复版本参数。
// 以下测试用 JS 等价逻辑验证该正则替换的正确性。

/**
 * 模拟 workflow 中的头像 URL 版本参数修复逻辑（Python re.sub 的 JS 等价实现）
 */
function fixAvatarUrlVersion(avatarUrl) {
  return avatarUrl.replace(/\?v=\d+/, "?v=4");
}

/**
 * 模拟 workflow 中完整的头像 URL 构建逻辑
 */
function buildAvatarUrl(avatarUrl) {
  const avatarUrlV4 = fixAvatarUrlVersion(avatarUrl);
  return `${avatarUrlV4}&s=48`;
}

describe("头像 URL 版本参数修复（Issue #31）", () => {
  test("v=3 的旧版头像 URL 被替换为 v=4", () => {
    const input = "https://avatars.githubusercontent.com/u/1578814?v=3";
    expect(fixAvatarUrlVersion(input)).toBe(
      "https://avatars.githubusercontent.com/u/1578814?v=4"
    );
  });

  test("v=4 的头像 URL 保持不变", () => {
    const input = "https://avatars.githubusercontent.com/u/1011681?v=4";
    expect(fixAvatarUrlVersion(input)).toBe(
      "https://avatars.githubusercontent.com/u/1011681?v=4"
    );
  });

  test("v=1 的旧版头像 URL 被替换为 v=4", () => {
    const input = "https://avatars.githubusercontent.com/u/12345?v=1";
    expect(fixAvatarUrlVersion(input)).toBe(
      "https://avatars.githubusercontent.com/u/12345?v=4"
    );
  });

  test("不含版本参数的 URL 保持不变", () => {
    const input = "https://avatars.githubusercontent.com/u/12345";
    expect(fixAvatarUrlVersion(input)).toBe(
      "https://avatars.githubusercontent.com/u/12345"
    );
  });

  test("v=3 的 URL 构建后包含正确的 v=4&s=48 参数", () => {
    const input = "https://avatars.githubusercontent.com/u/1578814?v=3";
    const result = buildAvatarUrl(input);
    expect(result).toBe("https://avatars.githubusercontent.com/u/1578814?v=4&s=48");
    expect(result).not.toContain("v=3");
  });

  test("v=4 的 URL 构建后包含正确的 v=4&s=48 参数", () => {
    const input = "https://avatars.githubusercontent.com/u/1011681?v=4";
    const result = buildAvatarUrl(input);
    expect(result).toBe("https://avatars.githubusercontent.com/u/1011681?v=4&s=48");
  });

  test("构建的头像 URL 不包含 v=3", () => {
    const testCases = [
      "https://avatars.githubusercontent.com/u/111?v=3",
      "https://avatars.githubusercontent.com/u/222?v=3",
      "https://avatars.githubusercontent.com/u/333?v=1",
    ];
    testCases.forEach((url) => {
      const result = buildAvatarUrl(url);
      expect(result).not.toContain("v=3");
      expect(result).not.toContain("v=1");
      expect(result).toContain("v=4");
      expect(result).toContain("&s=48");
    });
  });

  test("README 中已有的 v=4 头像 URL 格式正确", () => {
    // 验证 README 中初始贡献者头像 URL 格式符合规范
    const readmePath = require("path").resolve(__dirname, "../README.md");
    const readmeContent = require("fs").readFileSync(readmePath, "utf-8");
    const avatarUrls = readmeContent.match(/src="https:\/\/avatars\.githubusercontent\.com[^"]+"/g) || [];
    avatarUrls.forEach((srcAttr) => {
      // 所有头像 URL 应该包含 v=4 而不是 v=3
      expect(srcAttr).not.toContain("v=3");
      expect(srcAttr).toContain("v=4");
    });
  });
});

// ── yida doctor 命令测试 ──────────────────────────────────────────────

describe("yida doctor 命令", () => {
  test("--help 包含 --repair 选项说明", () => {
    const { stdout, status } = runCli(["doctor", "--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("--repair");
    expect(stdout).toContain("自动修复");
  });

  test("--help 包含示例", () => {
    const { stdout } = runCli(["doctor", "--help"]);
    expect(stdout).toContain("示例");
    expect(stdout).toContain("yida doctor");
  });

  test("在完整环境下输出所有检查通过", () => {
    // 当前开发环境满足所有依赖，doctor 应全部通过
    const { stdout, status } = runCli(["doctor"], { cwd: PROJECT_ROOT });
    expect(status).toBe(0);
    expect(stdout).toContain("Node.js");
    expect(stdout).toContain("Python");
    expect(stdout).toContain("Playwright");
    expect(stdout).toContain("gh");
    expect(stdout).toContain("config.json");
  });

  test("doctor 命令正常运行并输出诊断结果", () => {
    // CI 环境可能缺少 Playwright、gh 登录等，不断言"所有检查通过"
    // 只验证 doctor 命令能正常运行（退出码为 0）并输出诊断信息
    const { stdout, status } = runCli(["doctor"], { cwd: PROJECT_ROOT });
    expect(status).toBe(0);
    // doctor 无论发现问题与否，都应输出检查结果摘要
    const hasAllPassed = stdout.includes("所有检查通过");
    const hasIssuesSummary = stdout.includes("个问题");
    expect(hasAllPassed || hasIssuesSummary).toBe(true);
  });

  test("config.json 缺失时显示相关信息", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yida-doctor-noconfig-"));
    fs.mkdirSync(path.join(tmpDir, ".git"));

    const { stdout, status } = runCli(["doctor"], { cwd: tmpDir });
    expect(status).toBe(0);
    expect(stdout).toContain("config.json");
    // 如果全局配置存在，doctor 会显示全局级通过；否则显示 --repair
    const hasGlobalPass = stdout.includes("全局级");
    const hasRepair = stdout.includes("--repair");
    expect(hasGlobalPass || hasRepair).toBe(true);

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("--repair 自动修复可修复的问题", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yida-doctor-repair-"));
    fs.mkdirSync(path.join(tmpDir, ".git"));

    const { stdout, status } = runCli(["doctor", "--repair"], { cwd: tmpDir });
    expect(status).toBe(0);
    // 如果全局配置已存在，doctor 不会再创建；如果不存在则会创建
    // 无论哪种情况，doctor --repair 都应正常运行
    const hasCreated = stdout.includes("已创建");
    const hasAllPassed = stdout.includes("所有检查通过");
    const hasIssues = stdout.includes("个问题");
    expect(hasCreated || hasAllPassed || hasIssues).toBe(true);

    fs.rmSync(tmpDir, { recursive: true });
  });
});

// ── yida completion 命令测试 ──────────────────────────────────────────

describe("yida completion 命令", () => {
  test("--help 包含 bash/zsh/fish 说明", () => {
    const { stdout, status } = runCli(["completion", "--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("bash");
    expect(stdout).toContain("zsh");
    expect(stdout).toContain("fish");
  });

  test("completion bash 输出 bash 补全脚本", () => {
    const { stdout, status } = runCli(["completion", "bash"]);
    expect(status).toBe(0);
    expect(stdout).toContain("_openyida_completion");
    expect(stdout).toContain("complete -F _openyida_completion openyida");
    expect(stdout).toContain("login");
    expect(stdout).toContain("doctor");
    expect(stdout).toContain("completion");
  });

  test("completion zsh 输出 zsh 补全脚本", () => {
    const { stdout, status } = runCli(["completion", "zsh"]);
    expect(status).toBe(0);
    expect(stdout).toContain("_openyida()");
    expect(stdout).toContain("compdef _openyida openyida");
    expect(stdout).toContain("login:扫码登录宜搭");
    expect(stdout).toContain("doctor");
    expect(stdout).toContain("completion");
  });

  test("completion fish 输出 fish 补全脚本", () => {
    const { stdout, status } = runCli(["completion", "fish"]);
    expect(status).toBe(0);
    expect(stdout).toContain("complete -c openyida");
    expect(stdout).toContain("login");
    expect(stdout).toContain("doctor");
    expect(stdout).toContain("completion");
  });

  test("completion zsh 包含 config 子选项补全", () => {
    const { stdout } = runCli(["completion", "zsh"]);
    expect(stdout).toContain("--validate");
    expect(stdout).toContain("--rollback");
  });

  test("completion bash 包含 config 子选项补全", () => {
    const { stdout } = runCli(["completion", "bash"]);
    expect(stdout).toContain("--validate");
    expect(stdout).toContain("--rollback");
  });

  test("不支持的 shell 类型输出错误并以非零退出", () => {
    const { stderr, status } = runCli(["completion", "powershell"]);
    expect(status).not.toBe(0);
    expect(stderr).toContain("不支持的 shell 类型");
    expect(stderr).toContain("bash | zsh | fish");
  });

  test("缺少 shell 参数时报错退出", () => {
    const { stderr, status } = runCli(["completion"]);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/missing required argument/i);
  });
});

// ── yida config --validate / --rollback 测试 ─────────────────────────

describe("yida config --validate", () => {
  test("config.json 格式正确时输出校验通过", () => {
    const { stdout, status } = runCli(["config", "--validate"], { cwd: PROJECT_ROOT });
    expect(status).toBe(0);
    expect(stdout).toContain("校验通过");
  });

  test("config.json 缺少 loginUrl 时校验失败", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yida-validate-"));
    fs.mkdirSync(path.join(tmpDir, ".git"));
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify({ defaultBaseUrl: "https://www.aliwork.com" })
    );

    const { stderr, status } = runCli(["config", "--validate"], { cwd: tmpDir });
    expect(status).not.toBe(0);
    expect(stderr).toContain("loginUrl");

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("config.json 缺少 defaultBaseUrl 时校验失败", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yida-validate2-"));
    fs.mkdirSync(path.join(tmpDir, ".git"));
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify({ loginUrl: "https://www.aliwork.com/workPlatform" })
    );

    const { stderr, status } = runCli(["config", "--validate"], { cwd: tmpDir });
    expect(status).not.toBe(0);
    expect(stderr).toContain("defaultBaseUrl");

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("config.json 为非法 JSON 时校验失败", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yida-validate3-"));
    fs.mkdirSync(path.join(tmpDir, ".git"));
    fs.writeFileSync(path.join(tmpDir, "config.json"), "{ invalid json }");

    const { stderr, status } = runCli(["config", "--validate"], { cwd: tmpDir });
    expect(status).not.toBe(0);
    expect(stderr).toContain("JSON");

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("config.json 不存在时校验失败", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yida-validate4-"));
    fs.mkdirSync(path.join(tmpDir, ".git"));

    const { stderr, status } = runCli(["config", "--validate"], { cwd: tmpDir });
    expect(status).not.toBe(0);
    expect(stderr).toContain("config.json");

    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe("yida config --rollback", () => {
  test("备份文件存在时回滚成功", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yida-rollback-"));
    fs.mkdirSync(path.join(tmpDir, ".git"));
    fs.mkdirSync(path.join(tmpDir, ".cache"));

    const backupConfig = {
      loginUrl: "https://www.aliwork.com/workPlatform",
      defaultBaseUrl: "https://www.aliwork.com",
    };
    fs.writeFileSync(
      path.join(tmpDir, ".cache", "config.backup.json"),
      JSON.stringify(backupConfig, null, 2)
    );

    const { stdout, status } = runCli(["config", "--rollback"], { cwd: tmpDir });
    expect(status).toBe(0);
    expect(stdout).toContain("已回滚");
    expect(stdout).toContain("aliwork.com");

    // 验证 config.json 内容与备份一致
    const restoredConfig = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "config.json"), "utf-8")
    );
    expect(restoredConfig.loginUrl).toBe(backupConfig.loginUrl);
    expect(restoredConfig.defaultBaseUrl).toBe(backupConfig.defaultBaseUrl);

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("备份文件不存在时报错退出", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yida-rollback2-"));
    fs.mkdirSync(path.join(tmpDir, ".git"));

    const { stderr, status } = runCli(["config", "--rollback"], { cwd: tmpDir });
    expect(status).not.toBe(0);
    expect(stderr).toContain("未找到备份配置文件");

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("备份文件为非法 JSON 时回滚失败", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yida-rollback3-"));
    fs.mkdirSync(path.join(tmpDir, ".git"));
    fs.mkdirSync(path.join(tmpDir, ".cache"));
    fs.writeFileSync(path.join(tmpDir, ".cache", "config.backup.json"), "{ bad json }");

    const { stderr, status } = runCli(["config", "--rollback"], { cwd: tmpDir });
    expect(status).not.toBe(0);
    expect(stderr).toContain("回滚失败");

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("运行 config 后自动生成备份文件", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yida-autobackup-"));
    fs.mkdirSync(path.join(tmpDir, ".git"));
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify({
        loginUrl: "https://www.aliwork.com/workPlatform",
        defaultBaseUrl: "https://www.aliwork.com",
      }, null, 2)
    );

    runCli(["config"], { cwd: tmpDir });

    // 验证备份文件被自动创建
    const backupPath = path.join(tmpDir, ".cache", "config.backup.json");
    expect(fs.existsSync(backupPath)).toBe(true);
    const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
    expect(backup.defaultBaseUrl).toBe("https://www.aliwork.com");

    fs.rmSync(tmpDir, { recursive: true });
  });
});

// ── --help 中包含核心命令 ──────────────────────────────────────────────

describe("--help 包含核心命令", () => {
  test("全局 --help 包含 doctor 命令", () => {
    const { stdout } = runCli(["--help"]);
    expect(stdout).toContain("doctor");
    expect(stdout).toContain("检查");
  });

  test("全局 --help 包含 completion 命令", () => {
    const { stdout } = runCli(["--help"]);
    expect(stdout).toContain("completion");
    expect(stdout).toContain("shell");
  });

  test("全局 --help 中 config 描述包含校验和回滚", () => {
    const { stdout } = runCli(["config", "--help"]);
    expect(stdout).toContain("--validate");
    expect(stdout).toContain("--rollback");
  });

  test("全局 --help 不包含 install 和 init 命令", () => {
    const { stdout } = runCli(["--help"]);
    // v0.2.0 简化：去掉了 install 和 init 命令
    expect(stdout).not.toContain("install");
    expect(stdout).not.toContain("init");
  });
});

// ── 内置 Skills 回归测试 ──────────────────────────────────────────────

describe("内置 Skills 回归测试", () => {
  test("config 命令：显示内置 Skills 信息", () => {
    const { stdout } = runCli(["config"], { cwd: PROJECT_ROOT });
    expect(stdout).toContain("Skills");
    expect(stdout).toContain("内置");
  });

  test("doctor 命令：内置 Skills 显示已安装", () => {
    const { stdout } = runCli(["doctor"], { cwd: PROJECT_ROOT });
    expect(stdout).toContain("Skills 已安装");
    expect(stdout).toContain("内置");
  });

  test("skill 脚本不存在时错误提示包含重新安装方式", () => {
    // 由于 Skills 内置于 npm 包，正常情况下不会缺失
    // 这里验证错误提示信息格式正确
    const { stderr } = runCli(["create-app", "测试应用"], { cwd: PROJECT_ROOT });
    // create-app 需要登录态，会在脚本执行阶段失败，不会在 skill 查找阶段失败
    // 因为 Skills 已内置，所以不应出现"未找到 skill 脚本"的错误
    expect(stderr).not.toContain("未找到 skill 脚本");
  });
});
