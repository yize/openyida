# 宜搭 AI 应用开发指南

本项目通过 AI Coding 工具（Claude Code / OpenCode / Aone Copilot / Cursor / VS Code / 悟空 等）+ 宜搭低代码平台，实现一句话生成完整应用。

> **安装即用**：`npm install -g openyida` 后，Skills 内置于 npm 包，自动配置 IDE 集成，零配置。

---

## 项目结构

```
openyida（npm 包）/
├── bin/yida.js                  # CLI 入口
├── skills/                      # 内置 Skills（随 npm 包分发）
│   ├── yida-app/                # 完整应用开发流程
│   ├── yida-login/              # 登录态管理
│   ├── yida-logout/             # 退出登录
│   ├── yida-create-app/         # 创建应用
│   ├── yida-create-page/        # 创建自定义页面
│   ├── yida-create-form-page/   # 创建表单页面
│   ├── yida-get-schema/         # 获取表单 Schema
│   ├── yida-custom-page/        # 自定义页面代码规范
│   ├── yida-publish-page/       # 编译并发布页面
│   └── yida-page-config/        # 页面配置管理
├── scripts/postinstall.js       # 安装后自动配置
└── config.json                  # 默认配置模板

用户项目目录/
├── config.json                  # 项目级配置（可选，覆盖全局配置）
├── .cache/                      # 临时缓存（运行时自动生成）
│   └── cookies.json             # 登录态缓存
├── pages/src/                   # 自定义页面 JSX 源码
└── prd/                         # 需求文档

全局配置目录（~/.config/openyida/）：
├── config.json                  # 全局配置（安装时自动创建）
├── credentials/                 # 登录凭据
└── cache/                       # 全局缓存
```

---

## 环境依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| Node.js | ≥ 16 | 页面编译与发布脚本 |
| Python | ≥ 3.10 | 登录态管理 |
| Playwright | latest | 浏览器自动化（扫码登录） |

```bash
# 安装 Python 依赖
pip install playwright && playwright install chromium
```

---

## 完整开发流程

```
创建应用（yida-create-app）
    ↓
需求分析 → 写入 prd/<项目名>.md
    ↓
创建自定义页面（yida-create-page）
    ↓
（按需）创建表单（yida-create-form-page）→ 更新 prd 文档 + .cache/schema.json
    ↓
编写自定义页面代码（yida-custom-page 规范）→ pages/src/<项目名>.js
    ↓
发布代码（yida-publish-page）
    ↓
输出访问链接并用系统浏览器打开
```

> **登录态说明**：所有脚本自动读取 `.cache/cookies.json`，首次运行或 Cookie 失效时自动弹出浏览器引导扫码登录，无需手动执行登录命令。

---

## 技能（Skills）速查

> 推荐使用 CLI 命令，CLI 会自动定位内置 Skills 脚本。

| 技能 | CLI 命令 | 用途 |
|------|---------|------|
| `yida-login` | `openyida login` | 登录态管理（通常自动触发） |
| `yida-logout` | `openyida logout` | 退出登录 / 切换账号 |
| `yida-create-app` | `openyida create-app "<名称>"` | 创建应用，获取 appType |
| `yida-create-page` | `openyida create-page <appType> "<页面名>"` | 创建自定义页面，获取 pageId |
| `yida-create-form-page` | `openyida create-form <appType> "<表单名>" <字段JSON>` | 创建/更新表单页面 |
| `yida-get-schema` | `openyida get-schema <appType> <formUuid>` | 获取表单 Schema，确认字段 ID |
| `yida-custom-page` | 详见 Skills 目录中的 `SKILL.md` | 编写自定义页面 JSX 代码（React 16 规范） |
| `yida-publish-page` | `openyida publish <源文件路径> <appType> <formUuid>` | 编译并发布自定义页面 |

---

## 关键规则

### corpId 一致性检查（必须遵守）

在创建页面前，**必须对比 prd 文档中的 corpId 与 `.cache/cookies.json` 中的 corpId 是否一致**：

- **一致** → 继续执行
- **不一致** → 询问用户：重新登录到正确组织，还是在当前组织新建应用？

### 配置信息分两处存储

| 信息类型 | 存储位置 | 内容示例 |
|---------|---------|---------|
| 业务语义信息 | `prd/<项目名>.md` | 字段名称、字段类型、字段说明 |
| Schema ID | `.cache/<项目名>-schema.json` | `appType`、`formUuid`、`fieldId` |

> **prd 文档不记录 `formUuid`、`fieldId` 等 ID**，这些写入 `.cache/` 临时文件。

### 临时文件规范

- **项目内运行时**：临时文件写在项目根目录的 `.cache/` 文件夹中
- **全局模式**：登录态凭据优先读取项目 `.cache/cookies.json`，不存在则使用全局 `~/.config/openyida/credentials/cookies.json`

---

## 表单字段类型速查

| 类型 | 说明 | 特殊属性 |
|------|------|---------|
| `TextField` | 单行文本 | — |
| `TextareaField` | 多行文本 | — |
| `NumberField` | 数字 | `precision`（小数位）、`innerAfter`（单位） |
| `RadioField` | 单选 | `options` |
| `CheckboxField` | 多选 | `options` |
| `SelectField` | 下拉单选 | `options` |
| `MultiSelectField` | 下拉多选 | `options` |
| `DateField` | 日期 | `format`（如 `"YYYY-MM-DD"`） |
| `CascadeDateField` | 级联日期（范围） | `format` |
| `EmployeeField` | 成员选择 | `multiple` |
| `DepartmentSelectField` | 部门选择 | `multiple` |
| `AddressField` | 地址 | — |
| `AttachmentField` | 附件上传 | — |
| `ImageField` | 图片上传 | — |
| `TableField` | 子表格 | `children`（子字段列表） |
| `AssociationFormField` | 关联表单 | `associationForm` |
| `SerialNumberField` | 流水号 | `serialNumberRule` |
| `RateField` | 评分 | `count`（星级数） |
| `CountrySelectField` | 国家选择 | `multiple` |

---

## 宜搭应用 URL 规则

| 页面类型 | URL 格式 |
|---------|---------|
| 应用首页 | `{base_url}/{appType}/workbench` |
| 表单提交页 | `{base_url}/{appType}/submission/{formUuid}` |
| 自定义页面 | `{base_url}/{appType}/custom/{formUuid}` |
| 自定义页面（隐藏导航） | `{base_url}/{appType}/custom/{formUuid}?isRenderNav=false` |
| 表单详情页 | `{base_url}/{appType}/formDetail/{formUuid}?formInstId={formInstId}` |
| 表单详情页（编辑模式） | `{base_url}/{appType}/formDetail/{formUuid}?formInstId={formInstId}&mode=edit` |

> 所有地址拼接 `&corpid={corpId}` 可自动切换到对应组织。

---

## 常见问题

**Q：发布时提示登录失效？**
```bash
echo -n "" > .cache/cookies.json
node .claude/skills/skills/yida-publish-page/scripts/publish.js <appType> <formUuid> <源文件路径>
```

**Q：如何查看已有表单的字段 ID？**
使用 `yida-get-schema` 技能获取表单 Schema，从中读取各字段的 `fieldId`。

**Q：如何更新已有表单字段？**
使用 `yida-create-form-page` 的 update 模式：
```bash
node .claude/skills/skills/yida-create-form-page/scripts/create-form-page.js update <appType> <formUuid> '[{"action":"add","field":{"type":"TextField","label":"新字段"}}]'
```

**Q：发布时提示 corpId 不匹配？**
询问用户是否在当前组织创建新应用发布。
