import type { Decision, DecisionAnalysis } from '@/types/decision'

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []
  let line = ''
  for (const character of text) {
    if (context.measureText(line + character).width > maxWidth && line) {
      lines.push(line)
      line = character
    } else line += character
  }
  if (line) lines.push(line)
  return lines
}

export function decisionSummary(decision: Decision, analysis: DecisionAnalysis) {
  const ranking = analysis.results.map((result, index) => `${index + 1}. ${result.name}：${result.total.toFixed(1)} 分`).join('\n')
  const reasons = analysis.advantages.map((item) => `${item.name} +${item.delta.toFixed(1)}`).join('；') || '各项表现较为均衡'
  return `《${decision.title || '未命名决定'}》\n\n当前建议：${analysis.winner.name}（${analysis.winner.total.toFixed(1)} / 100）\n${ranking}\n\n主要优势：${reasons}\n模拟领先：${analysis.winner.winRate.toFixed(0)}%\n${decision.reflection ? `\n我的底线：${decision.reflection}\n` : ''}\n说明：结果仅反映当前评分与权重，不代表现实概率。`
}

export async function copyDecisionSummary(decision: Decision, analysis: DecisionAnalysis) {
  await navigator.clipboard.writeText(decisionSummary(decision, analysis))
}

export function exportDecisionCard(decision: Decision, analysis: DecisionAnalysis) {
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 1400
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')

  context.fillStyle = '#f2ecdc'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#0e2a22'
  context.fillRect(0, 0, canvas.width, 34)
  context.font = '500 28px "Geist", "PingFang SC", sans-serif'
  context.fillText('权衡  /  DECISION LEDGER', 90, 105)
  context.textAlign = 'right'
  context.fillText(new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date()), 1510, 105)
  context.textAlign = 'left'

  context.font = '600 58px "PingFang SC", "Microsoft YaHei", sans-serif'
  const titleLines = wrapText(context, decision.title || '未命名决定', 1400).slice(0, 2)
  titleLines.forEach((line, index) => context.fillText(line, 90, 200 + index * 76))
  const titleBottom = 200 + (titleLines.length - 1) * 76

  context.fillStyle = '#0e2a22'
  context.fillRect(90, titleBottom + 60, 1420, 330)
  context.fillStyle = '#c8f547'
  context.font = '500 24px "Geist", "PingFang SC", sans-serif'
  context.fillText('当前建议', 140, titleBottom + 120)
  context.font = '600 58px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillText(analysis.winner.name, 140, titleBottom + 205)
  context.font = '700 116px "Geist", sans-serif'
  context.fillText(analysis.winner.total.toFixed(1), 1130, titleBottom + 230)
  context.font = '400 26px "Geist", sans-serif'
  context.fillText('/ 100', 1360, titleBottom + 230)
  context.fillStyle = '#f2ecdc'
  context.font = '400 24px "PingFang SC", sans-serif'
  context.fillText(`领先 ${analysis.margin.toFixed(1)} 分  ·  模拟领先 ${analysis.winner.winRate.toFixed(0)}%`, 140, titleBottom + 290)

  const sectionTop = titleBottom + 455
  context.fillStyle = '#0e2a22'
  context.font = '600 30px "PingFang SC", sans-serif'
  context.fillText('完整排序', 90, sectionTop)
  analysis.results.slice(0, 4).forEach((result, index) => {
    const y = sectionTop + 65 + index * 64
    context.font = '400 25px "PingFang SC", sans-serif'
    context.fillText(`${index + 1}  ${result.name}`, 90, y)
    context.fillStyle = '#d9d2c2'
    context.fillRect(650, y - 20, 650, 16)
    context.fillStyle = index === 0 ? '#789f20' : '#0e2a22'
    context.fillRect(650, y - 20, 650 * result.total / 100, 16)
    context.fillStyle = '#0e2a22'
    context.textAlign = 'right'
    context.fillText(result.total.toFixed(1), 1450, y)
    context.textAlign = 'left'
  })

  const reasonY = sectionTop + 350
  context.font = '600 28px "PingFang SC", sans-serif'
  context.fillText('为什么是它', 90, reasonY)
  context.font = '400 24px "PingFang SC", sans-serif'
  const reason = analysis.advantages.length
    ? analysis.advantages.map((item) => `${item.name}贡献 +${item.delta.toFixed(1)} 分`).join('；')
    : '各项表现较为均衡。'
  wrapText(context, reason, 1380).slice(0, 2).forEach((line, index) => context.fillText(line, 90, reasonY + 55 + index * 38))

  if (decision.reflection) {
    context.font = '400 23px "PingFang SC", sans-serif'
    const reflection = `我的底线：${decision.reflection}`
    wrapText(context, reflection, 1380).slice(0, 2).forEach((line, index) => context.fillText(line, 90, reasonY + 160 + index * 34))
  } else {
    context.font = '400 20px "PingFang SC", sans-serif'
    context.fillText('结果只反映当前评分与权重；真正做决定的，仍然是你。', 90, reasonY + 160)
  }

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(decision.title || '我的决定').replace(/[\\/:*?"<>|]/g, '-')}-决策卡.png`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}
