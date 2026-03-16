## 快速开始

```bash
npm install -g openyida
```

**安装即用，零配置。** 安装后在 Claude Code / OpenCode / Aone Copilot 中直接对话：

- `帮我用宜搭创建一个 IPD 系统，需要管理芯片生产全流程`
- `帮我搭建一个 CRM`
- `帮我搭建个人薪资计算器应用`

---

## 支持的 AI 编程工具

- [Claude Code](https://claude.ai/code)
- [OpenCode](https://opencode.ai)
- [Aone Copilot](https://copilot.code.alibaba-inc.com)
- [Cursor](https://cursor.com/)
- [Visual Studio Code](https://code.visualstudio.com/)
- 悟空

---

## 与其他 AI 搭建平台的区别

| 维度 | OpenYida | 其他 AI 搭建平台 |
|------|----------|------------------|
| 目标用户 | 开发者（懂代码的人） | 业务人员（非开发者） |
| 交互方式 | 自然语言 + AI 对话 | 可视化拖拽 + 配置面板 |
| 产出物 | 宜搭应用（可二次编辑，支持完备低代码能力） | 配置（黑盒运行） |
| 部署方式 | 宜搭平台 | SaaS 平台绑定 |
| AI 模型 | 按需选择，选择最适合的模型 | 平台指定，无法更换 |
| 安全合规 | 宜搭具备完善的安全和合规能力 | 依赖平台能力（纯代码应用需重新审查） |

---

## 依赖环境

| 依赖 | 版本要求 | 用途 |
|------|----------|------|
| Node.js | ≥ 16 | CLI 运行、页面发布 |
| Python | ≥ 3.10 | 登录态管理（扫码登录） |
| Playwright | latest | 浏览器自动化 |

### CLI 命令一览

```bash
openyida login            # 扫码登录宜搭
openyida logout           # 退出登录
openyida create-app       # 创建宜搭应用
openyida create-page      # 创建自定义页面
openyida create-form      # 创建表单页面
openyida publish          # 发布页面
openyida get-schema       # 获取表单 Schema
openyida config           # 查看/校验/回滚配置
openyida doctor           # 检查环境依赖
openyida completion       # 输出 shell 自动补全脚本
openyida shell            # 进入交互式 REPL 模式
```
---

## DEMO 展示

### 业务系统 - IPD/CRM

![IPD](https://img.alicdn.com/imgextra/i2/O1CN01YBEMa929J7sD9v8U1_!!6000000008046-2-tps-3840-3366.png)

![CRM](https://img.alicdn.com/imgextra/i3/O1CN01kn0Vcn1H5OkbQaizA_!!6000000000706-2-tps-3840-2168.png)

### 💰 小工具 - 个人薪资计算器

![薪资计算器](https://gw.alicdn.com/imgextra/i2/O1CN017TeJuE1reVH2Dj7b7_!!6000000005656-2-tps-5114-2468.png)

---

### 🌐  Landing Page - 智联协同

企业级产品介绍页，一句话生成完整 Landing Page。

![智联协同](https://gw.alicdn.com/imgextra/i1/O1CN01EZtvfs1cxXV00UaXi_!!6000000003667-2-tps-5118-2470.png)

---

### 🏮 运营场景 - 看图猜灯谜

AI 生成灯谜图片，用户猜答案，猜错了有 AI 幽默提示。

![看图猜灯谜-2](https://img.alicdn.com/imgextra/i3/O1CN01dCoscP25jSAtAB9o3_!!6000000007562-2-tps-2144-1156.png)

---

## 常用问法

1. 帮我搭建一个 xxx 应用
2. 根据需求文档生成应用
3. 帮我创建一个 xxx 表单页面
4. 帮我给 xxx 页面添加一个 xxx 字段，字段名称：字段类型 xxx
5. 帮我给 xxx 页面 xxx 字段改为必填
6. 帮我发布 xxx 页面
7. 帮我把页面发布为公开访问
8. 重新登录
9. 退出登录

---

## OpenClaw

通过 [yida-app](https://clawhub.ai/nicky1108/yida-app) 在 OpenClaw 中使用。

安装：
```bash
npx clawhub@latest install nicky1108/yida-app
```

---

## OpenYida 社区

钉钉扫描加入 OpenYida 社区

![扫描加入 OpenYida 社区](https://img.alicdn.com/imgextra/i4/O1CN01RAlxmO1qF1cxRguyj_!!6000000005465-2-tps-350-356.png)

## 贡献者

感谢所有为 OpenYida 做出贡献的开发者！

### 贡献者
<p align="left">
  <a href="https://github.com/yize"><img src="https://avatars.githubusercontent.com/u/1578814?v=4&s=48" width="48" height="48" alt="yize" title="yize"/></a> <a href="https://github.com/alex-mm"><img src="https://avatars.githubusercontent.com/u/3302053?v=4&s=48" width="48" height="48" alt="alex-mm" title="alex-mm"/></a> <a href="https://github.com/nicky1108"><img src="https://avatars.githubusercontent.com/u/4279283?v=4&s=48" width="48" height="48" alt="nicky1108" title="nicky1108"/></a>
</p>

## License

[MIT](./LICENSE) © 2026 Alibaba Group
