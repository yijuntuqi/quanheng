# 权衡 · Tradeoff Ledger

一个透明、可编辑、可质疑的复杂决策工具。它不是随机选择器，也不会替用户宣布“正确答案”，而是把选项、考虑因素、权重、评分、代价和结论翻转条件放在同一张桌上。

## 核心功能

- 手动调用 SenseNova 生成决策草稿，也可完全手动编辑。
- AI 提示遗漏代价、关键假设、待核实事实，并提出澄清问题。
- 所有标题、背景、选项、因素、权重和评分均可编辑，本地分析实时更新。
- 加权排名、领先差距、优势与代价、单因素权重翻转临界点。
- 800 次固定种子的结论稳定性模拟，展示模拟领先比例与平均落后分数。
- 按需调用 AI 解读当前结果；任何编辑都会使旧解读失效。
- 撤销上次 AI 生成、示例库、新建决策、本地自动保存。
- 复制文字结论、导出 PNG 决策卡、PWA 离线打开。
- AI 失败时保留当前决策；过期请求不会覆盖较新的操作。

## 技术结构

- 前端：React 19、TypeScript、Vite、Tailwind CSS、Radix UI。
- 本地 AI 服务：Hono、tRPC、Superjson。
- AI：SenseNova OpenAI 兼容接口，JSON 输出，服务端 Zod 校验。
- 数据：当前决策只保存在浏览器 localStorage，无登录、数据库或云端历史。

本地算法始终是排名、翻盘条件和稳定性模拟的唯一计算来源。AI 只生成草稿与文字解释，不重新计算排名。

## 本地启动

建议使用 Node.js 22。

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

不配置 AI 时，示例库和完整手动决策功能仍可使用。需要 AI 时：

```bash
cp .env.example .env
```

Windows CMD 可使用：

```cmd
copy .env.example .env
```

在本地 `.env` 中填写新生成的 Key：

```dotenv
SENSENOVA_API_KEY=你的新Key
SENSENOVA_BASE_URL=https://token.sensenova.cn/v1
SENSENOVA_MODEL=sensenova-6.8-flash-lite
```

**密钥只能放在服务端环境变量中。不要添加 `VITE_` 前缀，不要把 `.env` 提交到仓库，也不要把真实 Key 写回 `.env.example`。如果 Key 曾在聊天或公开位置出现，请先在 SenseNova 控制台吊销并重新生成。**

配置后重启 `npm run dev`。AI 调用会消耗 SenseNova 账户额度，只有点击“生成决策表”或“解读当前结果”才会发送相应内容。

## 常用命令

```bash
npm run check   # TypeScript 类型检查
npm run lint    # ESLint
npm run build   # 构建前端与 bundled 服务端
npm start       # 以生产模式启动 dist/boot.js
```

生产运行需要保留 `dist/`、`package.json` 和服务端环境变量；服务端入口为 `dist/boot.js`，前端静态文件位于 `dist/public/`。

## Netlify 部署

仓库包含 `netlify.toml`，在 Netlify 选择“从 GitHub 导入”并选中本仓库即可，构建设置会自动读取。API 由 Netlify Functions 运行，不需要单独部署后端。

首次部署前，在 Netlify 项目的 **Project configuration → Environment variables** 中添加：

- `SENSENOVA_API_KEY`：SenseNova 密钥，仅保存在 Netlify 服务端。
- `SENSENOVA_BASE_URL`：`https://token.sensenova.cn/v1`。
- `SENSENOVA_MODEL`：`sensenova-6.8-flash-lite`。

添加或修改环境变量后重新部署。不要将真实密钥提交到 GitHub。

## 关键代码

| 路径 | 作用 |
| --- | --- |
| `src/pages/Home.tsx` | 页面状态、手动 AI 调用、撤销与导出 |
| `src/sections/` | 问题、决策编辑和结果展示区块 |
| `src/lib/decisionEngine.ts` | 加权分析、敏感性与 800 次模拟 |
| `src/lib/exportDecision.ts` | 文字结论与 PNG 决策卡 |
| `src/hooks/useDecisionStore.ts` | 本地读取、校验与自动保存 |
| `src/data/templates.ts` | 完整示例与空白决策 |
| `api/decisionRouter.ts` | 草稿生成、结果解读、校验、限流与错误降级 |
| `api/ai/ai-client.ts` | SenseNova 调用、JSON 解析与错误分类 |
| `api/boot.ts` | Hono 服务入口 |

## 隐私与使用边界

- 编辑内容只保存在当前浏览器；点击 AI 生成会发送所填问题，点击 AI 解读会发送当前决策表和本地分析结果。
- 不要在前端读取或下发 AI 密钥。
- 计费或额度请求不会自动重试，以免重复消耗额度。
- AI 输出只是讨论起点，不应被包装成已核实的现实事实或专业建议。
- 模拟领先比例只反映当前评分模型内的稳定性，不是现实概率。
