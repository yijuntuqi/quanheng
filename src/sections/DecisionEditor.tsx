import type { CSSProperties } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Decision, DecisionOption, DecisionUpdater } from '@/types/decision'

type DecisionEditorProps = {
  decision: Decision
  update: DecisionUpdater
}

export function DecisionEditor({ decision, update }: DecisionEditorProps) {
  const updateOption = (optionId: string, name: string) => update((current) => ({
    ...current,
    options: current.options.map((option) => option.id === optionId ? { ...option, name } : option),
  }))

  const addOption = () => update((current) => {
    const id = crypto.randomUUID()
    const scores = Object.fromEntries(current.criteria.map((criterion) => [criterion.id, 5]))
    return { ...current, options: [...current.options, { id, name: `选项 ${String.fromCharCode(65 + current.options.length)}`, scores }] }
  })

  const removeOption = (optionId: string) => update((current) => ({
    ...current,
    options: current.options.filter((option) => option.id !== optionId),
  }))

  const addCriterion = () => update((current) => {
    const id = crypto.randomUUID()
    return {
      ...current,
      criteria: [...current.criteria, { id, name: '新的考虑因素', weight: 5 }],
      options: current.options.map((option) => ({ ...option, scores: { ...option.scores, [id]: 5 } })),
    }
  })

  const removeCriterion = (criterionId: string) => update((current) => ({
    ...current,
    criteria: current.criteria.filter((criterion) => criterion.id !== criterionId),
    options: current.options.map((option) => {
      const scores = { ...option.scores }
      delete scores[criterionId]
      return { ...option, scores }
    }),
  }))

  const updateScore = (option: DecisionOption, criterionId: string, value: number) => update((current) => ({
    ...current,
    options: current.options.map((item) => item.id === option.id
      ? { ...item, scores: { ...item.scores, [criterionId]: Math.max(0, Math.min(10, Number.isFinite(value) ? value : 0)) } }
      : item),
  }))

  return (
    <div className="editor-column">
      <section className="editor-section decision-basics" aria-labelledby="basics-title">
        <div className="section-heading">
          <span className="section-marker" aria-hidden="true" />
          <h2 id="basics-title">这件事是什么？</h2>
        </div>
        <label className="field-label" htmlFor="decision-title">决定</label>
        <input
          id="decision-title"
          className="decision-title-input"
          value={decision.title}
          maxLength={80}
          onChange={(event) => update((current) => ({ ...current, title: event.target.value }))}
          placeholder="例如：下一份工作怎么选？"
        />
        <label className="field-label" htmlFor="decision-context">背景与约束 <span>可选</span></label>
        <textarea
          id="decision-context"
          className="context-input"
          value={decision.context}
          maxLength={300}
          onChange={(event) => update((current) => ({ ...current, context: event.target.value }))}
          placeholder="有哪些已经发生的事实、不能突破的限制？"
          rows={3}
        />
      </section>

      <section className="editor-section" aria-labelledby="options-title">
        <div className="section-heading with-action">
          <div><span className="section-marker" aria-hidden="true" /><h2 id="options-title">桌面上的选项</h2></div>
          <button className="add-button" type="button" onClick={addOption} disabled={decision.options.length >= 6}>
            <Plus size={16} /> 添加选项
          </button>
        </div>
        <div className="option-list">
          {decision.options.map((option, index) => (
            <div className="option-row" key={option.id}>
              <span className="option-letter">{String.fromCharCode(65 + index)}</span>
              <input
                aria-label={`选项 ${index + 1} 名称`}
                value={option.name}
                maxLength={40}
                onChange={(event) => updateOption(option.id, event.target.value)}
              />
              <button
                className="delete-button"
                type="button"
                aria-label={`删除${option.name}`}
                disabled={decision.options.length <= 2}
                onClick={() => removeOption(option.id)}
              ><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="editor-section" aria-labelledby="criteria-title">
        <div className="section-heading with-action">
          <div><span className="section-marker" aria-hidden="true" /><h2 id="criteria-title">什么才真正重要？</h2></div>
          <button className="add-button" type="button" onClick={addCriterion} disabled={decision.criteria.length >= 8}>
            <Plus size={16} /> 添加因素
          </button>
        </div>
        <p className="section-help">权重越高，对结果影响越大。</p>
        <div className="criteria-list">
          {decision.criteria.map((criterion) => (
            <div className="criterion-row" key={criterion.id}>
              <input
                className="criterion-name"
                aria-label="因素名称"
                value={criterion.name}
                maxLength={30}
                onChange={(event) => update((current) => ({
                  ...current,
                  criteria: current.criteria.map((item) => item.id === criterion.id ? { ...item, name: event.target.value } : item),
                }))}
              />
              <input
                className="weight-slider"
                type="range"
                min="1"
                max="10"
                step="1"
                value={criterion.weight}
                aria-label={`${criterion.name}权重`}
                style={{ '--range-progress': `${(criterion.weight - 1) / 9 * 100}%` } as CSSProperties}
                onChange={(event) => update((current) => ({
                  ...current,
                  criteria: current.criteria.map((item) => item.id === criterion.id ? { ...item, weight: Number(event.target.value) } : item),
                }))}
              />
              <output className="weight-value" aria-label={`${criterion.name}权重为${criterion.weight}`}>{criterion.weight}</output>
              <button
                className="delete-button"
                type="button"
                aria-label={`删除${criterion.name}`}
                disabled={decision.criteria.length <= 1}
                onClick={() => removeCriterion(criterion.id)}
              ><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="editor-section scoring-section" aria-labelledby="scores-title">
        <div className="section-heading">
          <span className="section-marker" aria-hidden="true" />
          <h2 id="scores-title">逐项打分，不凭总分感觉</h2>
        </div>
        <p className="section-help">按 0–10 评分，只用于相对比较。</p>
        <div className="score-table-wrap">
          <table className="score-table">
            <thead>
              <tr>
                <th scope="col">考虑因素</th>
                {decision.options.map((option) => <th scope="col" key={option.id}>{option.name || '未命名选项'}</th>)}
              </tr>
            </thead>
            <tbody>
              {decision.criteria.map((criterion) => (
                <tr key={criterion.id}>
                  <th scope="row"><span>{criterion.name}</span><small>权重 {criterion.weight}</small></th>
                  {decision.options.map((option) => {
                    const score = option.scores[criterion.id] ?? 5
                    return (
                      <td key={option.id}>
                        <div className="score-cell">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="1"
                            value={score}
                            aria-label={`${option.name}在${criterion.name}上的评分`}
                            onChange={(event) => updateScore(option, criterion.id, Number(event.target.value))}
                          />
                          <span className="score-track"><span style={{ width: `${score * 10}%` }} /></span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
