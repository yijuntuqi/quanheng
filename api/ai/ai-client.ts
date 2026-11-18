import type { ZodType } from 'zod'

const DEFAULT_BASE_URL = 'https://token.sensenova.cn/v1'
const DEFAULT_MODEL = 'sensenova-6.8-flash-lite'

export class AiUnavailable extends Error {
  name = 'AiUnavailable'
}

export class ContentRejected extends Error {
  name = 'ContentRejected'
}

export class AiMisconfigured extends Error {
  name = 'AiMisconfigured'
}

export class AiTransient extends Error {
  name = 'AiTransient'
}

type GenerateOptions<T> = {
  schema: ZodType<T>
  system: string
  prompt: string
  maxTokens?: number
}

type ErrorBody = {
  error?: { type?: string; message?: string; code?: string }
  message?: string
}

function readEnv(key: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[key]
}

function config() {
  const apiKey = readEnv('SENSENOVA_API_KEY')?.trim()
  if (!apiKey) {
    throw new AiMisconfigured('SENSENOVA_API_KEY 未配置')
  }
  return {
    apiKey,
    baseUrl: (readEnv('SENSENOVA_BASE_URL')?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    model: readEnv('SENSENOVA_MODEL')?.trim() || DEFAULT_MODEL,
  }
}

function parseBody(raw: string): unknown {
  if (!raw) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

function mapAiError(status: number, body: ErrorBody | undefined): Error {
  const type = body?.error?.type ?? ''
  if (type.includes('content') || type.includes('moderation')) {
    return new ContentRejected('内容被安全策略拦截')
  }
  if (status === 401 || status === 403) return new AiMisconfigured('SenseNova 凭证无效或已失效')
  if (status === 402) return new AiUnavailable('SenseNova 额度不足')
  if (status === 429) return new AiTransient('SenseNova 请求频繁或当前窗口额度不足')
  if (status === 408 || status === 424 || status >= 500) return new AiTransient('SenseNova 暂时不可用')
  if (status === 400 && type.includes('content')) return new ContentRejected('内容被安全策略拦截')
  return new AiTransient(`SenseNova 请求失败（HTTP ${status}）`)
}

export function classifyAiError(error: unknown): Error {
  if (error instanceof AiUnavailable || error instanceof ContentRejected || error instanceof AiMisconfigured || error instanceof AiTransient) {
    return error
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return new AiTransient('SenseNova 响应超时')
  }
  return new AiTransient(error instanceof Error ? error.message : 'AI 调用失败')
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return JSON.parse(fenced?.[1] ?? trimmed)
}

export async function generateSenseNovaJson<T>({
  schema,
  system,
  prompt,
  maxTokens = 4096,
}: GenerateOptions<T>): Promise<T> {
  const { apiKey, baseUrl, model } = config()
  let response: Response
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(60_000),
    })
  } catch (error) {
    throw classifyAiError(error)
  }

  const raw = await response.text()
  const payload = parseBody(raw)
  if (!response.ok) {
    throw mapAiError(response.status, payload as ErrorBody | undefined)
  }

  const result = payload as {
    choices?: { message?: { content?: unknown }; finish_reason?: string }[]
  } | undefined
  const choice = result?.choices?.[0]
  if (choice?.finish_reason === 'length') {
    throw new AiTransient('AI 输出被长度限制截断')
  }
  if (typeof choice?.message?.content !== 'string' || !choice.message.content.trim()) {
    throw new AiTransient('SenseNova 未返回有效内容')
  }

  try {
    const parsed = schema.safeParse(parseJsonContent(choice.message.content))
    if (!parsed.success) {
      throw new AiTransient('AI 返回结构未通过校验')
    }
    return parsed.data
  } catch (error) {
    if (error instanceof AiTransient) throw error
    throw new AiTransient('AI 未返回合法 JSON')
  }
}
