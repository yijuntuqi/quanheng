import { useState, type CSSProperties } from 'react'
import { ArrowDown, ArrowUp, Check, Info, LoaderCircle, Sparkles } from 'lucide-react'
import type { AiExplanation, AiRequestStatus, Decision, DecisionAnalysis, DecisionUpdater } from '@/types/decision'

type ResultsPanelProps = {
  decision: Decision
  analysis: DecisionAnalysis
  update: DecisionUpdater
  explanation: AiExplanation | null
  explanationStale: boolean
  explainStatus: AiRequestStatus
  explainMessage: string
  onExplain: () => void
}

export function ResultsPanel({
  decision,
  analysis,
  update,
  explanation,
  explanationStale,
  explainStatus,
  explainMessage,
  onExplain,
}: ResultsPanelProps) {
  const [resultTab, setResultTab] = useState<'reasons' | 'stress' | 'ai'>('reasons')
  const stabilityMessage = analysis.winner.winRate >= 75
    ? '目前结论比较稳，小幅评分误差通常不会改变第一名。'
    : analysis.winner.winRate >= 50
      ? '目前第一名有优势，但评分稍有变化就可能翻转，建议先核实关键因素。'
      : '几个选项非常接近，不建议只凭当前总分下结论。'

  return (
    <aside className="results-column" aria-label="实时分析结果">
      <div className="result-panel">
        <div className="result-topline">
          <span><span className="live-dot" /> 实时结论</span>
          <span>满分 100</span>
        </div>
        <div className="winner-block">
          <p>当前更值得优先考虑</p>
          <h2>{analysis.winner.name || '未命名选项'}</h2>
          <div className="winner-score">
            <strong>{analysis.winner.total.toFixed(1)}</strong><span>/ 100</span>
          </div>
          <p className="margin-note">领先下一选项 <b>{analysis.margin.toFixed(1)}</b> 分</p>
        </div>

        <div className="ranking-list" aria-label="选项排名">
          {analysis.results.map((result, index) => (
            <div className="ranking-row" key={result.id}>
              <div className="ranking-label"><span>{index + 1}. {result.name || '未命名选项'}</span><b>{result.total.toFixed(1)}</b></div>
              <div className="ranking-track"><span className={index === 0 ? 'leader' : ''} style={{ width: `${result.total}%` }} /></div>
            </div>
          ))}
        </div>

        <div className="result-tabs" role="tablist" aria-label="分析视图">
          <button type="button" role="tab" aria-selected={resultTab === 'reasons'} className={resultTab === 'reasons' ? 'active' : ''} onClick={() => setResultTab('reasons')}>为什么</button>
          <button type="button" role="tab" aria-selected={resultTab === 'stress'} className={resultTab === 'stress' ? 'active' : ''} onClick={() => setResultTab('stress')}>结论稳不稳</button>
          <button type="button" role="tab" aria-selected={resultTab === 'ai'} className={resultTab === 'ai' ? 'active' : ''} onClick={() => setResultTab('ai')}>AI 解读</button>
        </div>

        {resultTab === 'reasons' && (
          <div className="reasons-view" role="tabpanel">
            <div className="reason-group">
              <h3>赢在哪里</h3>
              {analysis.advantages.length ? analysis.advantages.map((item) => (
                <div className="reason-row" key={item.criterionId}>
                  <span><ArrowUp size={15} />{item.name}</span><b>+{item.delta.toFixed(1)}</b>
                </div>
              )) : <p className="muted-on-dark">目前没有单项拉开明显差距。</p>}
            </div>
            <div className="reason-group tradeoff-group">
              <h3>为此放弃了什么</h3>
              {analysis.disadvantages.length ? analysis.disadvantages.map((item) => (
                <div className="reason-row" key={item.criterionId}>
                  <span><ArrowDown size={15} />{item.name}</span><b>{item.delta.toFixed(1)}</b>
                </div>
              )) : <p className="muted-on-dark">相对第二选项，没有明显短板。</p>}
            </div>
            <div className="flip-section">
              <h3>什么变化会让结论翻盘</h3>
              {analysis.sensitivity.slice(0, 3).map((item) => (
                <div className="flip-row" key={item.criterionId}>
                  <span>{item.criterionName}</span>
                  {item.direction === 'none' ? (
                    <small><Check size={13} /> 权重 1–10 内不改变</small>
                  ) : (
                    <small>{item.direction === 'up' ? '升' : '降'}至 {item.threshold} 后，{item.nextWinner} 领先</small>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {resultTab === 'stress' && (
          <div className="stress-view" role="tabpanel">
            <div className="uncertainty-heading">
              <div><h3>如果评分有误差，第一名会变吗？</h3><span>± {decision.uncertainty.toFixed(1)} 分</span></div>
              <input
                type="range"
                min="0"
                max="3"
                step="0.5"
                value={decision.uncertainty}
                aria-label="评分不确定程度"
                style={{ '--range-progress': `${decision.uncertainty / 3 * 100}%` } as CSSProperties}
                onChange={(event) => update((current) => ({ ...current, uncertainty: Number(event.target.value) }))}
              />
              <div className="range-labels"><span>很有把握</span><span>没把握</span></div>
            </div>
            <p className="stability-summary">{stabilityMessage}</p>
            <p className="simulation-note">先拖动滑块设置评分误差。系统模拟 800 次小幅变化：模拟领先越高、平均落后越小，结论越稳。</p>
            <div className="simulation-list">
              {analysis.results.map((result) => (
                <div className="simulation-row" key={result.id}>
                  <div><span>{result.name}</span><b>{result.winRate.toFixed(0)}%</b></div>
                  <div className="simulation-track"><span style={{ width: `${result.winRate}%` }} /></div>
                  <small>模拟领先 {result.winRate.toFixed(0)}% · 平均落后 {result.averageRegret.toFixed(1)} 分</small>
                </div>
              ))}
            </div>
            <p className="probability-disclaimer"><Info size={14} /> 这里只检查评分误差是否容易改变排名，不代表选项在现实中的成功概率。</p>
          </div>
        )}

        {resultTab === 'ai' && (
          <div className="ai-review-view" role="tabpanel">
            {explanation ? (
              <>
                {explanationStale && <p className="ai-review-stale">决策已修改，以下仍是上次解读。</p>}
                <div className="ai-review-block"><h3>当前结果</h3><p>{explanation.summary}</p></div>
                <div className="ai-review-block"><h3>主要取舍</h3><p>{explanation.tradeoff}</p></div>
                <div className="ai-review-block">
                  <h3>值得再想想</h3>
                  <ul>{explanation.followUpQuestions.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                {explainMessage && <p className={explainStatus === 'error' ? 'ai-review-error' : ''} aria-live="polite">{explainMessage}</p>}
                <button className="ai-review-button" type="button" onClick={onExplain} disabled={explainStatus === 'loading'}>
                  {explainStatus === 'loading' ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}
                  {explainStatus === 'loading' ? '正在解读' : '重新解读'}
                </button>
              </>
            ) : (
              <div className="ai-review-empty">
                <p>把当前决策表和本地计算结果发给 SenseNova，生成一段不改动排名的文字解读。</p>
                {explainMessage && <p className={explainStatus === 'error' ? 'ai-review-error' : ''} aria-live="polite">{explainMessage}</p>}
                <button className="ai-review-button" type="button" onClick={onExplain} disabled={explainStatus === 'loading'}>
                  {explainStatus === 'loading' ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}
                  {explainStatus === 'loading' ? '正在解读' : explainStatus === 'error' ? '重新解读' : '解读当前结果'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="result-footnote">修改选项、权重或评分后，结果会自动更新。</p>
    </aside>
  )
}
