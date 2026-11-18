# 权衡 Quanheng

**把选项、重要程度和代价放在一起，看清一个决定为什么成立。**

一个透明、可编辑、可质疑的 AI 辅助复杂决策工具。它不会随机给答案，也不替用户宣布“正确选择”，而是帮助用户比较多个选项，理解结论的依据、代价和可能发生翻转的条件。

[在线体验](https://choisi.netlify.app) · [本地运行](#本地运行) · [技术架构](#技术架构)

## 为什么做这个项目

面对升学、职业选择等复杂问题，真正困难的往往不是获得更多建议，而是同时处理：

- 有哪些候选选项？
- 哪些因素真正重要？
- 每个选择需要付出什么代价？
- 当前结论有多稳定，什么变化会让它翻转？

权衡把这些信息放在同一张决策表中，让结论可以被检查，而不是只给用户一个无法解释的答案。

## 核心功能

- **多选项加权比较**：编辑候选选项、考虑因素、权重和评分，实时查看排名与领先差距。
- **优势与代价分析**：不仅展示哪个选项领先，也展示它为什么领先、放弃了什么。
- **结论翻转条件**：计算单个因素的权重达到什么程度时，当前排名可能改变。
- **结论稳定性模拟**：通过 800 次固定种子扰动模拟，展示评分存在误差时各选项的模拟领先比例与平均落后分数。
- **AI 决策草稿**：使用 SenseNova 补全候选选项、考虑因素、权重与初始评分。
- **AI 追问与提醒**：提示遗漏的代价、关键假设和待核实事实，帮助用户发现自己真正重视的东西。
- **AI 结果解读**：用自然语言解释当前权衡结果；修改决策后保留上次解读并标记已过期。
- **本地保存与导出**：自动保存到浏览器，支持复制文字结论、导出 PNG 决策卡。
- **示例与离线使用**：内置示例库，支持 PWA 离线打开；不配置 AI 也能完整手动使用。

## 产品原则

### AI 辅助思考，算法负责计算

AI 只负责生成草稿、提出追问和解释结果。最终排名、翻盘条件和稳定性模拟始终由本地确定性算法计算，不让大模型重新决定名次。

### 隐私优先，不为低频工具增加负担

没有登录、数据库、跨设备同步和云端历史记录。编辑内容仅保存在当前浏览器；只有用户主动点击 AI 功能时，才发送对应的问题或决策内容。

### 展示不确定性

模拟领先比例只反映当前评分模型内的稳定性，不是现实概率。AI 输出也只是讨论起点，不能替代事实核实或专业建议。

## 技术架构

| 部分 | 技术 |
| --- | --- |
| 前端 | React 19、TypeScript、Vite、Tailwind CSS、Radix UI |
| API | Hono、tRPC、Superjson |
| AI | SenseNova OpenAI 兼容接口、JSON 输出、Zod 校验 |
| 本地数据 | localStorage |
| 离线能力 | Vite PWA、Workbox |
| 部署 | GitHub、Netlify、Netlify Functions |

本地开发由 Vite 和 Hono 提供页面与 API；线上静态资源部署到 Netlify，`/api/*` 请求由 Netlify Functions 承载。SenseNova API Key 只存在服务端环境变量中。

## 本地运行

建议使用 **Node.js 22**。

```bash
git clone git@github.com:yijuntuqi/quanheng.git
cd quanheng
npm ci
npm run dev
```

打开 `http://localhost:3000`。

### 配置 AI（可选）

复制环境变量示例：

```bash
cp .env.example .env
```

Windows CMD：

```cmd
copy .env.example .env
```

然后在 `.env` 中填写：

```dotenv
SENSENOVA_API_KEY=你的Key
SENSENOVA_BASE_URL=https://token.sensenova.cn/v1
SENSENOVA_MODEL=sensenova-6.8-flash-lite
```

修改 `.env` 后需要完整重启开发服务。AI 功能会消耗 SenseNova 账户额度，只有点击“生成决策表”或“解读当前结果”时才会发起请求。

> 密钥只能放在服务端环境变量中。不要添加 `VITE_` 前缀，不要提交 `.env`，也不要把真实 Key 写入 `.env.example`。

## 常用命令

```bash
npm run dev      # 启动本地开发服务
npm run check    # TypeScript 类型检查
npm run lint     # ESLint
npm run build    # 构建前端与服务端
npm run preview  # 预览前端构建
npm start        # 以生产模式启动 Node 服务
```

## 部署到 Netlify

仓库已包含 `netlify.toml`。在 Netlify 中选择 **Import an existing project**，连接此 GitHub 仓库即可自动读取构建设置：

- Build command：`npm run build`
- Publish directory：`dist/public`
- Functions directory：`netlify/functions`
- Node.js：22

在 **Project configuration → Environment variables** 中配置：

| 变量 | 说明 | 是否作为 Secret |
| --- | --- | --- |
| `SENSENOVA_API_KEY` | SenseNova 密钥 | 是 |
| `SENSENOVA_BASE_URL` | API 地址 | 否 |
| `SENSENOVA_MODEL` | 模型名称 | 否 |

添加或修改环境变量后重新部署。API 地址和模型名属于仓库中的公开配置，若误标记为 Secret，可能触发 Netlify Secret Scanning 并使构建失败。

## 项目结构

```text
.
├── api/                    # Hono/tRPC API 与 SenseNova 调用
├── netlify/functions/      # Netlify Serverless API 入口
├── public/                 # 图标等静态资源
├── src/
│   ├── components/         # 通用 UI 组件
│   ├── data/               # 示例与空白决策模板
│   ├── hooks/              # 本地决策状态与持久化
│   ├── lib/                # 决策引擎、导出与工具函数
│   ├── pages/              # 页面状态与主要交互
│   ├── providers/          # tRPC 等上下文
│   ├── sections/           # 问题、编辑与结果区块
│   └── types/              # TypeScript 类型
├── netlify.toml            # Netlify 构建与路由配置
└── vite.config.ts          # Vite 与 PWA 配置
```

## 当前状态

项目处于初步开发阶段，核心决策流程与线上部署已完成，后续将继续优化移动端体验、结果解释和自动化测试。

如果你也在思考“如何更透明地做复杂决定”，欢迎提交 Issue 或 PR。
