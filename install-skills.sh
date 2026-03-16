#!/usr/bin/env sh
# install-skills.sh - 安装 yida-skills
#
# 兼容：macOS / Linux（sh/bash/zsh）
# Windows 用户请使用：install-skills.ps1
#
# 用法：
#   bash install-skills.sh           # 自动检测网络，国内自动使用加速源
#   bash install-skills.sh --cn      # 强制使用国内加速源
#   bash install-skills.sh --global  # 强制使用原始 GitHub 地址

set -e

SKILLS_DIR=".claude/skills"
GITHUB_URL="https://github.com/openyida/yida-skills.git"
# ghproxy.com 是社区维护的 GitHub 加速代理，国内访问 GitHub 时使用
GHPROXY_URL="https://ghproxy.com/https://github.com/openyida/yida-skills.git"
BRANCH="main"

echo "🔧 正在安装 yida-skills..."

# 检查是否在项目根目录（有 .git 或 config.json）
if [ ! -f "config.json" ] && [ ! -d ".git" ]; then
  echo "❌ 请在项目根目录下运行此脚本"
  exit 1
fi

# ── 环境依赖检查与自动安装 ────────────────────────────────────────────

# 检查 git
if ! command -v git > /dev/null 2>&1; then
  echo "❌ 未找到 git，请先安装 Git："
  echo "   macOS:  brew install git  或访问 https://git-scm.com"
  echo "   Linux:  sudo apt install git  /  sudo yum install git"
  exit 1
fi

# 检查并安装 Node.js
if ! command -v node > /dev/null 2>&1; then
  echo "⚠️  未找到 Node.js（yida-publish 等脚本需要 Node.js ≥ 16）"
  if command -v brew > /dev/null 2>&1; then
    echo "📦 检测到 Homebrew，正在自动安装 Node.js..."
    brew install node
    echo "✅ Node.js 安装完成：$(node --version)"
    echo "📦 配置 npm 淘宝镜像源..."
    npm config set registry https://registry.npmmirror.com
    echo "✅ npm 镜像源已设置为淘宝镜像（npmmirror.com）"
  elif command -v apt-get > /dev/null 2>&1; then
    echo "📦 检测到 apt，正在自动安装 Node.js（阿里云镜像）..."
    curl -fsSL https://mirrors.aliyun.com/nodesource/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js 安装完成：$(node --version)"
    echo "📦 配置 npm 淘宝镜像源..."
    npm config set registry https://registry.npmmirror.com
    echo "✅ npm 镜像源已设置为淘宝镜像（npmmirror.com）"
  elif command -v yum > /dev/null 2>&1; then
    echo "📦 检测到 yum，正在自动安装 Node.js（阿里云镜像）..."
    curl -fsSL https://mirrors.aliyun.com/nodesource/setup_lts.x | sudo bash -
    sudo yum install -y nodejs
    echo "✅ Node.js 安装完成：$(node --version)"
    echo "📦 配置 npm 淘宝镜像源..."
    npm config set registry https://registry.npmmirror.com
    echo "✅ npm 镜像源已设置为淘宝镜像（npmmirror.com）"
  else
    echo "💡 请手动安装 Node.js（≥ 16）：https://nodejs.org"
    echo "   或使用 nvm：https://github.com/nvm-sh/nvm"
    echo "   安装完成后重新运行此脚本"
    exit 1
  fi
else
  NODE_VERSION=$(node --version | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  if [ "$NODE_MAJOR" -lt 16 ]; then
    echo "⚠️  Node.js 版本过低（当前 v${NODE_VERSION}，要求 ≥ 16）"
    echo "💡 请升级 Node.js：https://nodejs.org 或使用 nvm 管理版本"
  else
    echo "✅ Node.js v${NODE_VERSION}"
  fi
fi

# 检查并安装 Python
if ! command -v python3 > /dev/null 2>&1; then
  echo "⚠️  未找到 Python（yida-login / yida-logout 需要 Python ≥ 3.10）"
  if command -v brew > /dev/null 2>&1; then
    echo "📦 检测到 Homebrew，正在自动安装 Python..."
    brew install python
    echo "✅ Python 安装完成：$(python3 --version)"
    echo "📦 配置 pip 阿里云镜像源..."
    pip3 config set global.index-url https://mirrors.aliyun.com/pypi/simple/
    pip3 config set global.trusted-host mirrors.aliyun.com
    echo "✅ pip 镜像源已设置为阿里云（mirrors.aliyun.com）"
  elif command -v apt-get > /dev/null 2>&1; then
    echo "📦 检测到 apt，正在自动安装 Python..."
    sudo apt-get install -y python3 python3-pip
    echo "✅ Python 安装完成：$(python3 --version)"
    echo "📦 配置 pip 阿里云镜像源..."
    pip3 config set global.index-url https://mirrors.aliyun.com/pypi/simple/
    pip3 config set global.trusted-host mirrors.aliyun.com
    echo "✅ pip 镜像源已设置为阿里云（mirrors.aliyun.com）"
  elif command -v yum > /dev/null 2>&1; then
    echo "📦 检测到 yum，正在自动安装 Python..."
    sudo yum install -y python3 python3-pip
    echo "✅ Python 安装完成：$(python3 --version)"
    echo "📦 配置 pip 阿里云镜像源..."
    pip3 config set global.index-url https://mirrors.aliyun.com/pypi/simple/
    pip3 config set global.trusted-host mirrors.aliyun.com
    echo "✅ pip 镜像源已设置为阿里云（mirrors.aliyun.com）"
  else
    echo "💡 请手动安装 Python（≥ 3.10）：https://www.python.org"
    echo "   安装完成后重新运行此脚本"
    exit 1
  fi
else
  PYTHON_VERSION=$(python3 --version 2>&1 | sed 's/Python //')
  PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d. -f1)
  PYTHON_MINOR=$(echo "$PYTHON_VERSION" | cut -d. -f2)
  if [ "$PYTHON_MAJOR" -lt 3 ] || { [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 10 ]; }; then
    echo "⚠️  Python 版本过低（当前 ${PYTHON_VERSION}，要求 ≥ 3.10）"
    echo "💡 请升级 Python：https://www.python.org"
  else
    echo "✅ Python ${PYTHON_VERSION}"
  fi
fi

echo ""

# ── 判断使用哪个源 ────────────────────────────────────────────────────

USE_PROXY=0

if [ "$1" = "--cn" ]; then
  USE_PROXY=1
  echo "🇨🇳 已指定使用国内加速源"
elif [ "$1" = "--global" ]; then
  USE_PROXY=0
  echo "🌐 已指定使用原始 GitHub 地址"
else
  # 自动检测：尝试连接 GitHub，超时 3 秒
  echo "🔍 检测网络环境..."
  if curl -s --connect-timeout 3 https://github.com > /dev/null 2>&1; then
    echo "🌐 GitHub 可直连，使用原始地址"
    USE_PROXY=0
  else
    echo "🇨🇳 GitHub 连接超时，自动切换到国内加速源（ghproxy.com）"
    USE_PROXY=1
  fi
fi

if [ "$USE_PROXY" = "1" ]; then
  CLONE_URL="${GHPROXY_URL}"
else
  CLONE_URL="${GITHUB_URL}"
fi

# ── 安装 Skills ───────────────────────────────────────────────────────

if [ -d "${SKILLS_DIR}" ]; then
  echo "📦 ${SKILLS_DIR} 已存在，拉取最新代码（branch: ${BRANCH}）..."
  git -C "${SKILLS_DIR}" fetch origin "${BRANCH}" && git -C "${SKILLS_DIR}" checkout "${BRANCH}" && git -C "${SKILLS_DIR}" pull origin "${BRANCH}"
else
  echo "📦 克隆 yida-skills（branch: ${BRANCH}）到 ${SKILLS_DIR}..."
  git clone --branch "${BRANCH}" --depth 1 "${CLONE_URL}" "${SKILLS_DIR}"
fi

echo "✅ Skills 安装完成：${SKILLS_DIR}/skills/"
echo ""
echo "已安装的 Skills："
if [ -d "${SKILLS_DIR}/skills" ]; then
  for skill_dir in "${SKILLS_DIR}/skills"/*/; do
    skill_name=$(basename "${skill_dir}")
    echo "  - ${skill_name}"
  done
else
  echo "  （未找到 skills 子目录）"
fi
