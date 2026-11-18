import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clipboard,
  Download,
  FilePlus2,
  Info,
  Scale,
} from 'lucide-react'
import { toast, Toaster } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { decisionTemplates } from '@/data/templates'
import { useDecisionStore } from '@/hooks/useDecisionStore'
import { analyzeDecision } from '@/lib/decisionEngine'
import { copyDecisionSummary, exportDecisionCard } from '@/lib/exportDecision'
import { trpc } from '@/providers/trpc'
import { DecisionEditor } from '@/sections/DecisionEditor'
import { QuestionPanel } from '@/sections/QuestionPanel'
import { ResultsPanel } from '@/sections/ResultsPanel'
import type {
  AiExplanation,
  AiRequestStatus,
  AiWatchout,
  Decision,
  DecisionUpdater,
} from '@/types/decision'
import '../App.css'

export default function Home() {
  const { decision, update, loadTemplate, reset, saveState } = useDecisionStore()
  const analysis = useMemo(() => analyzeDecision(decision), [decision])
  const [examplesOpen, setExamplesOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [question, setQuestion] = useState(decision.title)
  const [aiState, setAiState] = useState<AiRequestStatus>('idle')
  const [aiMessage, setAiMessage] = useState('')
  const [watchouts, setWatchouts] = useState<AiWatchout[]>([])
  const [draftQuestions, setDraftQuestions] = useState<string[]>([])
  const [previousDecision, setPreviousDecision] = useState<Decision | null>(null)
  const [explanation, setExplanation] = useState<AiExplanation | null>(null)
  const [explanationStale, setExplanationStale] = useState(false)
  const [explainState, setExplainState] = useState<AiRequestStatus>('idle')
  const [explainMessage, setExplainMessage] = useState('')
  const { mutateAsync: generateDraft } = trpc.decision.generate.useMutation()
  const { mutateAsync: explainDecision } = trpc.decision.explain.useMutation()
  const generateSequence = useRef(0)
  const explainSequence = useRef(0)

  const updateDecision: DecisionUpdater = useCallback((recipe) => {
    generateSequence.current += 1
    setAiState('idle')
    setAiMessage('')
    explainSequence.current += 1
    setExplanationStale(true)
    setExplainState('idle')
    setExplainMessage('')
    update(recipe)
  }, [update])

  const generateFromQuestion = useCallback(async () => {
    const normalized = question.trim()
    if (normalized.length < 6) return
    const sequence = ++generateSequence.current
    setAiState('loading')
    setAiMessage('正在组织选项、权重和需要核实的信息…')
    try {
      const draft = await generateDraft({ question: normalized })
      if (sequence !== generateSequence.current) return
      const criteria = draft.criteria.map((criterion) => ({ ...criterion, id: crypto.randomUUID() }))
      const options = draft.options.map((option) => ({
        id: crypto.randomUUID(),
        name: option.name,
        scores: Object.fromEntries(criteria.map((criterion, index) => [criterion.id, option.scores[index] ?? 5])),
      }))
      setPreviousDecision(decision)
      updateDecision(() => ({
        version: 1,
        title: draft.title,
        context: draft.context,
        criteria,
        options,
        uncertainty: 1,
        reflection: '',
        updatedAt: new Date().toISOString(),
      }))
      setExplanation(null)
      setExplanationStale(false)
      setWatchouts(draft.watchouts)
      setDraftQuestions(draft.followUpQuestions)
      setAiState('success')
      setAiMessage(`已生成 ${options.length} 个选项和 ${criteria.length} 个考虑因素，请按真实情况修改。`)
    } catch (error) {
      if (sequence !== generateSequence.current) return
      setAiState('error')
      setAiMessage(error instanceof Error ? error.message : '生成失败，请重试；当前内容已保留。')
    }
  }, [decision, generateDraft, question, updateDecision])

  const explainCurrentDecision = useCallback(async () => {
    const sequence = ++explainSequence.current
    setExplainState('loading')
    setExplainMessage('正在解读当前结果…')
    try {
      const result = await explainDecision({ decision, analysis })
      if (sequence !== explainSequence.current) return
      setExplanation(result)
      setExplanationStale(false)
      setExplainState('success')
      setExplainMessage('')
    } catch (error) {
      if (sequence !== explainSequence.current) return
      setExplainState('error')
      setExplainMessage(error instanceof Error ? error.message : '解读失败，请稍后重试。')
    }
  }, [analysis, decision, explainDecision])

  const handleQuestionChange = (value: string) => {
    generateSequence.current += 1
    setQuestion(value)
    setAiState('idle')
    setAiMessage('')
    setWatchouts([])
    setDraftQuestions([])
    setPreviousDecision(null)
  }

  const chooseTemplate = (index: number) => {
    generateSequence.current += 1
    explainSequence.current += 1
    setQuestion(decisionTemplates[index].decision.title)
    loadTemplate(index)
    setExamplesOpen(false)
    setAiState('idle')
    setAiMessage('')
    setWatchouts([])
    setDraftQuestions([])
    setPreviousDecision(null)
    setExplanation(null)
    setExplanationStale(false)
    setExplainState('idle')
    setExplainMessage('')
    toast.success(`已载入「${decisionTemplates[index].label}」示例`)
  }

  const createBlankDecision = () => {
    generateSequence.current += 1
    explainSequence.current += 1
    reset()
    setQuestion('')
    setPreviousDecision(null)
    setResetOpen(false)
    setAiState('idle')
    setAiMessage('')
    setWatchouts([])
    setDraftQuestions([])
    setExplanation(null)
    setExplanationStale(false)
    setExplainState('idle')
    setExplainMessage('')
    toast.success('已建好一张空白决策表')
  }

  const undoGeneration = () => {
    if (!previousDecision) return
    const restored = previousDecision
    generateSequence.current += 1
    setQuestion(restored.title)
    updateDecision(() => restored)
    setPreviousDecision(null)
    setWatchouts([])
    setDraftQuestions([])
    setAiState('idle')
    setAiMessage('')
    toast.success('已恢复生成前的决策表')
  }

  const handleCopy = async () => {
    try {
      await copyDecisionSummary(decision, analysis)
      toast.success('结论已复制，可以发给一起商量的人了')
    } catch {
      toast.error('浏览器没有允许复制，请检查剪贴板权限')
    }
  }

  const handleExport = () => {
    try {
      exportDecisionCard(decision, analysis)
      toast.success('决策卡已生成')
    } catch {
      toast.error('导出失败，请稍后重试')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="权衡首页">
          <Scale size={23} strokeWidth={1.8} aria-hidden="true" />
          <span className="brand-name">权衡</span>
          <span className="brand-en">DECISION LEDGER</span>
        </a>
        <div className="topbar-actions">
          <span className={`save-status ${saveState}`} aria-live="polite">
            {saveState === 'error' ? <Info size={14} /> : <Check size={14} />}
            {saveState === 'saving' ? '正在保存' : saveState === 'error' ? '本机保存失败' : '已保存到本机'}
          </span>
          <button className="text-button" type="button" onClick={() => setExamplesOpen(true)}>示例库</button>
          <button className="icon-text-button" type="button" onClick={() => setResetOpen(true)}>
            <FilePlus2 size={16} aria-hidden="true" /> 新建
          </button>
        </div>
      </header>

      <main id="top">
        <section className="intro" aria-labelledby="page-title">
          <h1 id="page-title">不是替你决定，而是看清你为何决定。</h1>
        </section>

        <QuestionPanel
          question={question}
          onQuestionChange={handleQuestionChange}
          onGenerate={() => void generateFromQuestion()}
          status={aiState}
          message={aiMessage}
          canUndo={previousDecision !== null}
          onUndo={undoGeneration}
          watchouts={watchouts}
          followUpQuestions={draftQuestions}
        />

        <section className={`workspace ${aiState === 'loading' ? 'ai-updating' : ''}`} aria-label="决策工作区" aria-busy={aiState === 'loading'}>
          <DecisionEditor decision={decision} update={updateDecision} />
          <ResultsPanel
            decision={decision}
            analysis={analysis}
            update={updateDecision}
            explanation={explanation}
            explanationStale={explanationStale}
            explainStatus={explainState}
            explainMessage={explainMessage}
            onExplain={() => void explainCurrentDecision()}
          />
        </section>

        <section className="reflection-section" aria-labelledby="reflection-title">
          <div>
            <p className="kicker"><span /> 最后一步</p>
            <h2 id="reflection-title">数字之外，你的底线是什么？</h2>
          </div>
          <div className="reflection-input-area">
            <label htmlFor="reflection">即使其他选项总分更高，我也不能接受……</label>
            <textarea
              id="reflection"
              rows={4}
              maxLength={240}
              value={decision.reflection}
              onChange={(event) => updateDecision((current) => ({ ...current, reflection: event.target.value }))}
              placeholder="例如：每天通勤不能超过 90 分钟；不能牺牲周末陪伴家人的时间。"
            />
            <div className="export-row">
              <button className="primary-button" type="button" onClick={handleExport}><Download size={17} /> 导出决策卡</button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="secondary-button" type="button">更多导出 <ChevronDown size={16} /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="export-menu">
                  <DropdownMenuItem onClick={handleCopy}><Clipboard size={16} /> 复制文字结论</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}><Download size={16} /> 下载 PNG 决策卡</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </section>

        <details className="methodology">
          <summary>这套方法怎么算？<ArrowRight size={17} /></summary>
          <div>
            <p><b>加权总分：</b>每个选项的得分 = Σ（单项评分 × 因素权重）÷ 总权重 × 10。分数因此落在 0–100。</p>
            <p><b>翻盘条件：</b>固定其他权重，只改变某一个因素的权重，寻找当前第一名被超过的临界点。</p>
            <p><b>结论稳不稳：</b>设置你对评分的把握，系统模拟 800 次小幅变化。“模拟领先”是该选项在模拟中排名第一的比例，“平均落后”是它落后于当次第一名的平均分数。领先比例越高、平均落后越小，结论越不容易受评分误差影响。</p>
            <p>这些结果只用于比较，不是现实概率，也不能替代事实调查。AI 只提供草稿与解释，最终排名始终由本地算法计算。</p>
          </div>
        </details>
      </main>

      <footer>
        <span>权衡 · 把决定的理由留下来</span>
        <span>LOCAL-FIRST / NO ACCOUNT / NO JUDGEMENT</span>
      </footer>

      <Dialog open={examplesOpen} onOpenChange={setExamplesOpen}>
        <DialogContent className="examples-dialog">
          <DialogHeader>
            <DialogTitle>从一张真实的桌面开始</DialogTitle>
            <DialogDescription>载入示例会替换当前内容。你可以修改其中的每一项。</DialogDescription>
          </DialogHeader>
          <div className="template-list">
            {decisionTemplates.map((template, index) => (
              <button type="button" key={template.id} onClick={() => chooseTemplate(index)}>
                <span><b>{template.label}</b><small>{template.description}</small></span>
                <ArrowRight size={20} />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="reset-dialog">
          <DialogHeader>
            <DialogTitle>开始一个新的决定？</DialogTitle>
            <DialogDescription>当前内容会被清空。建议先导出决策卡，留住这次思考。</DialogDescription>
          </DialogHeader>
          <div className="dialog-actions">
            <button className="secondary-button" type="button" onClick={() => setResetOpen(false)}>继续编辑</button>
            <button className="primary-button" type="button" onClick={createBlankDecision}>新建决定</button>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster position="bottom-center" toastOptions={{ className: 'app-toast' }} />
    </div>
  )
}
