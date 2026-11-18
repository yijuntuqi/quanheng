export type DecisionOption = {
  id: string
  name: string
  scores: Record<string, number>
}

export type Criterion = {
  id: string
  name: string
  weight: number
}

export type Decision = {
  version: 1
  title: string
  context: string
  options: DecisionOption[]
  criteria: Criterion[]
  uncertainty: number
  reflection: string
  updatedAt: string
}

export type OptionResult = {
  id: string
  name: string
  total: number
  contributions: Record<string, number>
  winRate: number
  averageRegret: number
}

export type SensitivityResult = {
  criterionId: string
  criterionName: string
  direction: 'up' | 'down' | 'none'
  threshold: number | null
  nextWinner: string | null
}

export type DecisionAnalysis = {
  results: OptionResult[]
  winner: OptionResult
  runnerUp: OptionResult | null
  margin: number
  advantages: { criterionId: string; name: string; delta: number }[]
  disadvantages: { criterionId: string; name: string; delta: number }[]
  sensitivity: SensitivityResult[]
}

export type DecisionUpdater = (recipe: (current: Decision) => Decision) => void

export type AiRequestStatus = 'idle' | 'loading' | 'success' | 'error'

export type AiWatchout = {
  kind: 'cost' | 'assumption' | 'fact'
  text: string
}

export type AiExplanation = {
  summary: string
  tradeoff: string
  followUpQuestions: string[]
}
