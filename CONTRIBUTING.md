# Contributing to OpenYiDA

Welcome! We're excited that you're interested in contributing. Please read this guide to get started.

## Ways to Contribute

- **Report bugs** - Open an issue with details about the problem
- **Suggest features** - Share your ideas in the issue tracker
- **Improve documentation** - Help make the docs clearer and more complete
- **Add new skills** - Extend the skill package for more capabilities
- **Submit code changes** - Fix bugs or add new features

## Development Setup

```bash
# Fork and clone the repository
git clone git@github.com:your-username/openyida.git
cd openyida

# 安装依赖（Skills 已内置于 skills/ 目录，无需额外安装）
npm install

# 安装 Python 依赖（登录功能需要）
pip install playwright && playwright install chromium

# 运行测试
npm test
```

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and commit: `git commit -m "Add your feature"`
3. Push to your fork: `git push origin feature/your-feature`
4. Open a Pull Request

## Code Style

- Follow existing code conventions in the project
- Keep changes focused and minimal
- Write clear commit messages

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
