# SenseNova Decision Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 接入 SenseNova 的可编辑决策草稿与结果解读，同时简化单页工作区并移除未使用的数据库基础设施。

**Architecture:** 保留 React 本地决策引擎和 localStorage。Hono/tRPC 仅承担 AI 代理，SenseNova JSON 响应在服务端通过 Zod 校验；前端将草稿、提醒和解读与确定性计算结果明确分开。

**Tech Stack:** React 19、TypeScript、Vite、Hono、tRPC、Zod、SenseNova OpenAI-compatible Chat Completions。

**Spec:** `docs/superpowers/specs/2026-11-18-sensenova-decision-design.md`

## Global Constraints

- 不记录、提交或下发真实 API Key；`.env.example` 只含空值和非敏感默认值。
- 默认模型为 `sensenova-6.8-flash-lite`，使用 `response_format: { type: "json_object" }`。
- 不自动调用 AI，不让 AI 重新计算或覆盖本地分析结论。
- 不做登录、同步、云端历史或 Netlify 部署改动。
- 项目当前没有测试文件，不新增测试文件；每个任务运行现有静态检查，最终进行本地服务验证。
- 当前目录不是 Git 仓库，不执行提交或分支操作。

## Review Focus

- SenseNova 返回 Markdown 代码围栏、非法 JSON 或字段缺失：拒绝结果并保留当前决策，由 Task 1 的异常处理和 Task 3 的无 Key 降级验证覆盖。
- 模型返回评分数量与因素数量不一致：服务端按因素顺序补齐或截断后再校验，由 Task 1 的归一化步骤覆盖。
- AI 请求晚于用户新操作返回：前端序列号阻止过期结果覆盖，由 Task 2 的请求状态步骤覆盖。
- 解读后用户修改评分：旧解读立即隐藏，由 Task 2 的统一更新入口覆盖。
- 未配置 AI 或 AI 失败：手动编辑、本地保存和导出仍可用，由 Task 3 的本地验证覆盖。

---

### Task 1: SenseNova 服务端与结构化接口

**Files:**
- Modify: `api/ai/ai-client.ts`
- Delete: `api/ai/provider.ts`
- Modify: `api/decisionRouter.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `generateSenseNovaJson<T>({ schema, system, prompt, maxTokens? }): Promise<T>`，负责请求、JSON 解析和 Zod 校验。
- Produces: `trpc.decision.generate`，输入 `{ question: string }`，返回草稿及 `watchouts`、`followUpQuestions`。
- Produces: `trpc.decision.explain`，输入 `{ decision, analysis }`，返回 `{ summary, tradeoff, followUpQuestions }`。

- [ ] **Step 1: 实现 SenseNova 客户端**
  使用原生 `fetch` 调用 `/chat/completions`，从 `SENSENOVA_API_KEY`、`SENSENOVA_BASE_URL`、`SENSENOVA_MODEL` 读取配置；超时、HTTP 错误、空内容、代码围栏和非法 JSON 均转换为现有分类错误，不记录密钥或响应隐私内容。

- [ ] **Step 2: 扩展生成与解读路由**
  草稿 schema 包含 `watchouts: { kind: 'cost'|'assumption'|'fact', text: string }[]` 和 `followUpQuestions: string[]`。解读输入用 Zod 限制字符串、数组和数值范围；提示词只解释传入的本地分析，不生成新排名。

- [ ] **Step 3: 更新环境变量示例**
  删除 Kimi、APP 和数据库变量，写入空 API Key、默认 Base URL 和默认模型。

- [ ] **Step 4: 静态检查**
  Run: `npm run check`
  Expected: 若前端尚未适配新返回字段，只允许出现后续 Task 2 将解决的未使用或类型错误；服务端文件自身不得有类型错误。

### Task 2: 简洁工作区与按需 AI 交互

**Files:**
- Modify: `src/types/decision.ts`
- Create: `src/sections/QuestionPanel.tsx`
- Create: `src/sections/DecisionEditor.tsx`
- Create: `src/sections/ResultsPanel.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: Task 1 的 `generate`、`explain` 返回结构。
- Produces: `AiWatchout`、`AiExplanation` 前端类型。
- Produces: 三个展示组件；`Home.tsx` 持有决策、草稿提醒、解读和请求状态。

- [ ] **Step 1: 拆分展示组件**
  将现有问题、编辑和结果区域迁移到 `src/sections/`，保持已有本地计算、编辑限制和导出行为，不引入新状态管理库。

- [ ] **Step 2: 接入手动 AI 操作**
  生成按钮调用草稿接口并保留撤销；解读按钮调用解读接口。统一决策更新入口清除旧解读，请求序列号阻止过期响应覆盖新状态。

- [ ] **Step 3: 简化视觉层级**
  压缩标题与留白，将 AI 提醒、追问和解读按需展示；压力测试保留在结果标签中，方法说明保持折叠，移动端不横向溢出。

- [ ] **Step 4: 静态检查**
  Run: `npm run check && npm run lint`
  Expected: 均通过，无 React Hooks 或无障碍相关新增错误。

### Task 3: 清理、文档与本地验收

**Files:**
- Delete: `db/`、`contracts/`、`api/queries/`、`drizzle.config.ts`
- Modify: `package.json`、`package-lock.json`
- Modify: `tsconfig.server.json`、`vitest.config.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1–2 的完整应用。
- Produces: 不含 Drizzle/MySQL 的本地 React + Hono/tRPC 项目。

- [ ] **Step 1: 移除未使用基础设施和依赖**
  删除确认无引用的目录、配置、脚本、依赖和路径别名；通过 `npm install --package-lock-only` 同步锁文件，不新增替代依赖。

- [ ] **Step 2: 更新文档**
  README 说明 SenseNova 配置、手动 AI、隐私边界、本地保存和无数据库结构；移除旧 Kimi 网关与 MySQL 指令。

- [ ] **Step 3: 运行完整静态验证**
  Run: `npm run check && npm run lint && npm run build`
  Expected: 三个命令全部通过。

- [ ] **Step 4: 启动本地服务并验证**
  启动 `npm run dev`，确认首页和 `/api/trpc/ping` 可访问；无 Key 时 AI 失败不影响手动编辑。真实 SenseNova 生成与解读须由用户使用本地新 Key 验证，并明确记录是否执行。
