import { useCallback, useEffect, useRef, useState } from 'react'
import { blankDecision, instantiateTemplate } from '@/data/templates'
import type { Decision } from '@/types/decision'

const STORAGE_KEY = 'quanheng.decision.v1'

function isDecision(value: unknown): value is Decision {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Decision>
  return candidate.version === 1
    && typeof candidate.title === 'string'
    && typeof candidate.context === 'string'
    && typeof candidate.reflection === 'string'
    && typeof candidate.uncertainty === 'number'
    && Array.isArray(candidate.options)
    && candidate.options.length >= 2
    && candidate.options.every((option) => typeof option.id === 'string' && typeof option.name === 'string' && option.scores && typeof option.scores === 'object')
    && Array.isArray(candidate.criteria)
    && candidate.criteria.length >= 1
    && candidate.criteria.every((criterion) => typeof criterion.id === 'string' && typeof criterion.name === 'string' && typeof criterion.weight === 'number')
}

function loadInitial(): Decision {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (isDecision(parsed)) return parsed
    }
  } catch {
    // A damaged or unavailable local store falls back to a fresh example.
  }
  return instantiateTemplate()
}

export function useDecisionStore() {
  const [decision, setDecisionState] = useState<Decision>(loadInitial)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(decision))
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [decision])

  const update = useCallback((recipe: (current: Decision) => Decision) => {
    setDecisionState((current) => ({ ...recipe(current), updatedAt: new Date().toISOString() }))
  }, [])

  const loadTemplate = useCallback((index: number) => setDecisionState(instantiateTemplate(index)), [])
  const reset = useCallback(() => setDecisionState(blankDecision()), [])
  const restoreExample = useCallback(() => setDecisionState(instantiateTemplate()), [])

  return { decision, update, loadTemplate, reset, restoreExample, saveState }
}
