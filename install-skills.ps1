# install-skills.ps1 - 安装 yida-skills（Windows PowerShell）
#
# 兼容：Windows PowerShell 5.1+ / PowerShell Core 7+
# Mac/Linux 用户请使用：install-skills.sh
#
# 用法：
#   .\install-skills.ps1           # 自动检测网络，国内自动使用加速源
#   .\install-skills.ps1 --cn      # 强制使用国内加速源
#   .\install-skills.ps1 --global  # 强制使用原始 GitHub 地址
#   PowerShell -ExecutionPolicy Bypass -File install-skills.ps1

param(
    [string]$Mode = ""
)

$ErrorActionPreference = "Continue"

$SkillsDir = ".claude\skills"
$GithubUrl = "https://github.com/openyida/yida-skills.git"
# ghproxy.com 是社区维护的 GitHub 加速代理，国内访问 GitHub 时使用
$GhproxyUrl = "https://ghproxy.com/https://github.com/openyida/yida-skills.git"
$Branch = "main"

Write-Host "🔧 正在安装 yida-skills..." -ForegroundColor Cyan

# 检查是否在项目根目录（有 .git 或 config.json）
if (-not (Test-Path "config.json") -and -not (Test-Path ".git")) {
    Write-Host "❌ 请在项目根目录下运行此脚本" -ForegroundColor Red
    exit 1
}

# ── 环境依赖检查与自动安装 ────────────────────────────────────────────

# 检查 git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 未找到 git，请先安装 Git for Windows：https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

# 检查并安装 Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  未找到 Node.js（yida-publish 等脚本需要 Node.js ≥ 16）" -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "📦 检测到 winget，正在自动安装 Node.js LTS..." -ForegroundColor Cyan
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        # 刷新环境变量
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        if (Get-Command node -ErrorAction SilentlyContinue) {
            Write-Host "✅ Node.js 安装完成：$(node --version)" -ForegroundColor Green
            Write-Host "📦 配置 npm 淘宝镜像源..." -ForegroundColor Cyan
            npm config set registry https://registry.npmmirror.com
            Write-Host "✅ npm 镜像源已设置为淘宝镜像（npmmirror.com）" -ForegroundColor Green
        } else {
            Write-Host "💡 Node.js 已安装，请重新打开终端后再运行此脚本" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "💡 请手动安装 Node.js（≥ 16）：https://nodejs.org" -ForegroundColor Yellow
        Write-Host "   安装完成后重新运行此脚本" -ForegroundColor Yellow
        exit 1
    }
} else {
    $nodeVersionRaw = node --version
    $nodeVersion = $nodeVersionRaw -replace "^v", ""
    $nodeMajor = [int]($nodeVersion -split "\.")[0]
    if ($nodeMajor -lt 16) {
        Write-Host "⚠️  Node.js 版本过低（当前 $nodeVersionRaw，要求 ≥ 16）" -ForegroundColor Yellow
        Write-Host "💡 请升级 Node.js：https://nodejs.org" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Node.js $nodeVersionRaw" -ForegroundColor Green
    }
}

# 检查并安装 Python
if (-not (Get-Command python3 -ErrorAction SilentlyContinue) -and -not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  未找到 Python（yida-login / yida-logout 需要 Python ≥ 3.10）" -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "📦 检测到 winget，正在自动安装 Python..." -ForegroundColor Cyan
        winget install Python.Python.3.12 --accept-source-agreements --accept-package-agreements
        # 刷新环境变量
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        if (Get-Command python -ErrorAction SilentlyContinue) {
            Write-Host "✅ Python 安装完成：$(python --version)" -ForegroundColor Green
            Write-Host "📦 配置 pip 阿里云镜像源..." -ForegroundColor Cyan
            python -m pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/
            python -m pip config set global.trusted-host mirrors.aliyun.com
            Write-Host "✅ pip 镜像源已设置为阿里云（mirrors.aliyun.com）" -ForegroundColor Green
        } else {
            Write-Host "💡 Python 已安装，请重新打开终端后再运行此脚本" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "💡 请手动安装 Python（≥ 3.10）：https://www.python.org" -ForegroundColor Yellow
        Write-Host "   安装完成后重新运行此脚本" -ForegroundColor Yellow
        exit 1
    }
} else {
    $pythonCmd = if (Get-Command python3 -ErrorAction SilentlyContinue) { "python3" } else { "python" }
    $pythonVersionRaw = & $pythonCmd --version 2>&1
    $pythonVersion = ($pythonVersionRaw -replace "Python ", "").Trim()
    $versionParts = $pythonVersion -split "\."
    $pythonMajor = [int]$versionParts[0]
    $pythonMinor = [int]$versionParts[1]
    if ($pythonMajor -lt 3 -or ($pythonMajor -eq 3 -and $pythonMinor -lt 10)) {
        Write-Host "⚠️  Python 版本过低（当前 $pythonVersion，要求 ≥ 3.10）" -ForegroundColor Yellow
        Write-Host "💡 请升级 Python：https://www.python.org" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Python $pythonVersion" -ForegroundColor Green
    }
}

Write-Host ""

# ── 判断使用哪个源 ────────────────────────────────────────────────────

$UseProxy = $false

if ($Mode -eq "--cn") {
    $UseProxy = $true
    Write-Host "🇨🇳 已指定使用国内加速源" -ForegroundColor Cyan
} elseif ($Mode -eq "--global") {
    $UseProxy = $false
    Write-Host "🌐 已指定使用原始 GitHub 地址" -ForegroundColor Cyan
} else {
    # 自动检测：尝试连接 GitHub，超时 3 秒
    Write-Host "🔍 检测网络环境..." -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri "https://github.com" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop | Out-Null
        Write-Host "🌐 GitHub 可直连，使用原始地址" -ForegroundColor Green
        $UseProxy = $false
    } catch {
        Write-Host "🇨🇳 GitHub 连接超时，自动切换到国内加速源（ghproxy.com）" -ForegroundColor Yellow
        $UseProxy = $true
    }
}

$CloneUrl = if ($UseProxy) { $GhproxyUrl } else { $GithubUrl }

# ── 安装 Skills ───────────────────────────────────────────────────────

if (Test-Path $SkillsDir) {
    Write-Host "📦 $SkillsDir 已存在，拉取最新代码（branch: $Branch）..." -ForegroundColor Yellow
    git -C $SkillsDir fetch origin $Branch
    git -C $SkillsDir checkout $Branch
    git -C $SkillsDir pull origin $Branch
} else {
    Write-Host "📦 克隆 yida-skills（branch: $Branch）到 $SkillsDir..." -ForegroundColor Yellow
    git clone --branch $Branch --depth 1 $CloneUrl $SkillsDir
}

Write-Host "✅ Skills 安装完成：$SkillsDir\skills\" -ForegroundColor Green
Write-Host ""
Write-Host "已安装的 Skills：" -ForegroundColor Cyan

$SkillsSubDir = Join-Path $SkillsDir "skills"
if (Test-Path $SkillsSubDir) {
    Get-ChildItem -Path $SkillsSubDir -Directory | ForEach-Object {
        Write-Host "  - $($_.Name)"
    }
} else {
    Write-Host "  （未找到 skills 子目录）" -ForegroundColor Yellow
}
