import { Check, Info, LoaderCircle, RotateCcw, Sparkles } from 'lucide-react'
import type { AiRequestStatus, AiWatchout } from '@/types/decision'

type QuestionPanelProps = {
  question: string
  onQuestionChange: (value: string) => void
  onGenerate: () => void
  status: AiRequestStatus
  message: string
  canUndo: boolean
  onUndo: () => void
  watchouts: AiWatchout[]
  followUpQuestions: string[]
}

const watchoutLabels = {
  cost: '遗漏代价',
  assumption: '关键假设',
  fact: '待核实',
}

export function QuestionPanel({
  question,
  onQuestionChange,
  onGenerate,
  status,
  message,
  canUndo,
  onUndo,
  watchouts,
  followUpQuestions,
}: QuestionPanelProps) {
  return (
    <section className="question-section" aria-labelledby="question-title">
      <div className="question-label">
        <span><Sparkles size={17} /> 智能起点</span>
        <small>仅在点击后发送问题</small>
      </div>
      <div className="question-input-row">
        <textarea
          id="question-title"
          aria-label="你正在为什么犹豫"
          rows={2}
          maxLength={300}
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault()
              if (question.trim().length >= 6 && status !== 'loading') onGenerate()
            }
          }}
          placeholder="例如：我该留在大城市，还是回到家乡发展？"
        />
        <button
          className="generate-button"
          type="button"
          disabled={question.trim().length < 6 || status === 'loading'}
          onClick={onGenerate}
        >
          {status === 'loading' ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
          {status === 'loading' ? '正在生成' : status === 'error' ? '重新生成' : '生成决策表'}
          <kbd>⌘ ↵</kbd>
        </button>
      </div>
      <div className={`ai-feedback ${status}`} aria-live="polite">
        <span>
          {status === 'loading' && <LoaderCircle className="spin" size={14} />}
          {status === 'success' && <Check size={14} />}
          {status === 'error' && <Info size={14} />}
          {message || 'AI 只提供可编辑草稿；事实、权重和评分仍需你确认。'}
        </span>
        {canUndo && status === 'success' && (
          <button type="button" onClick={onUndo}><RotateCcw size={13} /> 撤销上次生成</button>
        )}
      </div>

      {(watchouts.length > 0 || followUpQuestions.length > 0) && (
        <div className="ai-draft-insights">
          {watchouts.length > 0 && (
            <div>
              <h2>先别急着打分</h2>
              <ul className="watchout-list">
                {watchouts.map((item, index) => (
                  <li key={`${item.kind}-${index}`}>
                    <span>{watchoutLabels[item.kind]}</span>
                    <p>{item.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {followUpQuestions.length > 0 && (
            <div>
              <h2>再问自己一句</h2>
              <ul className="followup-list">
                {followUpQuestions.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
