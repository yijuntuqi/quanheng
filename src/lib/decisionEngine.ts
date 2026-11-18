import type { Decision, DecisionAnalysis, OptionResult, SensitivityResult } from '@/types/decision'

const clamp = (value: number, min = 0, max = 10) => Math.min(max, Math.max(min, value))
const round = (value: number, digits = 1) => Number(value.toFixed(digits))

function scoreFor(decision: Decision, optionId: string, criterionId: string, weightOverride?: number) {
  const option = decision.options.find((item) => item.id === optionId)
  return clamp(option?.scores[criterionId] ?? 5) * (weightOverride ?? decision.criteria.find((item) => item.id === criterionId)?.weight ?? 0)
}

function totalsFor(decision: Decision, criterionId?: string, weight?: number) {
  const weightSum = decision.criteria.reduce((sum, criterion) => sum + (criterion.id === criterionId && weight !== undefined ? weight : criterion.weight), 0) || 1
  return decision.options.map((option) => ({
    id: option.id,
    name: option.name,
    total: decision.criteria.reduce((sum, criterion) => {
      const activeWeight = criterion.id === criterionId && weight !== undefined ? weight : criterion.weight
      return sum + scoreFor(decision, option.id, criterion.id, activeWeight)
    }, 0) / weightSum * 10,
  }))
}

function leader(decision: Decision, criterionId?: string, weight?: number) {
  return [...totalsFor(decision, criterionId, weight)].sort((a, b) => b.total - a.total)[0]
}

function mulberry32(seed: number) {
  return () => {
    let value = seed += 0x6D2B79F5
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

function simulate(decision: Decision) {
  const iterations = 800
  const random = mulberry32(20261114)
  const wins = Object.fromEntries(decision.options.map((option) => [option.id, 0]))
  const regret = Object.fromEntries(decision.options.map((option) => [option.id, 0]))

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const weights = decision.criteria.map((criterion) => criterion.weight * (0.85 + random() * 0.3))
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0) || 1
    const totals = decision.options.map((option) => ({
      id: option.id,
      total: decision.criteria.reduce((sum, criterion, index) => {
        const score = clamp((option.scores[criterion.id] ?? 5) + (random() * 2 - 1) * decision.uncertainty)
        return sum + score * weights[index]
      }, 0) / weightSum * 10,
    }))
    const best = Math.max(...totals.map((item) => item.total))
    const winners = totals.filter((item) => Math.abs(item.total - best) < 0.0001)
    winners.forEach((item) => { wins[item.id] += 1 / winners.length })
    totals.forEach((item) => { regret[item.id] += best - item.total })
  }

  return { wins, regret, iterations }
}

function sensitivityFor(decision: Decision, winnerId: string): SensitivityResult[] {
  return decision.criteria.map((criterion) => {
    for (const direction of ['down', 'up'] as const) {
      const boundary = direction === 'down' ? 1 : 10
      if ((direction === 'down' && criterion.weight === 1) || (direction === 'up' && criterion.weight === 10)) continue
      const atBoundary = leader(decision, criterion.id, boundary)
      if (atBoundary.id === winnerId) continue
      let low = direction === 'down' ? boundary : criterion.weight
      let high = direction === 'down' ? criterion.weight : boundary
      for (let step = 0; step < 24; step += 1) {
        const middle = (low + high) / 2
        const currentLeader = leader(decision, criterion.id, middle)
        if (currentLeader.id === winnerId) {
          if (direction === 'down') high = middle
          else low = middle
        } else {
          if (direction === 'down') low = middle
          else high = middle
        }
      }
      const threshold = direction === 'down' ? high : low
      const next = leader(decision, criterion.id, direction === 'down' ? Math.max(1, threshold - 0.05) : Math.min(10, threshold + 0.05))
      return { criterionId: criterion.id, criterionName: criterion.name, direction, threshold: round(threshold), nextWinner: next.name }
    }
    return { criterionId: criterion.id, criterionName: criterion.name, direction: 'none' as const, threshold: null, nextWinner: null }
  }).sort((a, b) => {
    if (a.direction === 'none') return 1
    if (b.direction === 'none') return -1
    const aDistance = Math.abs((a.threshold ?? 0) - (decision.criteria.find((item) => item.id === a.criterionId)?.weight ?? 0))
    const bDistance = Math.abs((b.threshold ?? 0) - (decision.criteria.find((item) => item.id === b.criterionId)?.weight ?? 0))
    return aDistance - bDistance
  })
}

export function analyzeDecision(decision: Decision): DecisionAnalysis {
  const weightSum = decision.criteria.reduce((sum, criterion) => sum + criterion.weight, 0) || 1
  const baseResults = decision.options.map((option) => {
    const contributions = Object.fromEntries(decision.criteria.map((criterion) => [
      criterion.id,
      (option.scores[criterion.id] ?? 5) * criterion.weight / weightSum * 10,
    ]))
    return {
      id: option.id,
      name: option.name,
      total: Object.values(contributions).reduce((sum, value) => sum + value, 0),
      contributions,
      winRate: 0,
      averageRegret: 0,
    }
  }).sort((a, b) => b.total - a.total)

  const simulation = simulate(decision)
  const results: OptionResult[] = baseResults.map((result) => ({
    ...result,
    total: round(result.total),
    winRate: round(simulation.wins[result.id] / simulation.iterations * 100),
    averageRegret: round(simulation.regret[result.id] / simulation.iterations),
  }))
  const winner = results[0]
  const runnerUp = results[1] ?? null

  const deltas = decision.criteria.map((criterion) => ({
    criterionId: criterion.id,
    name: criterion.name,
    delta: runnerUp ? round(winner.contributions[criterion.id] - runnerUp.contributions[criterion.id]) : 0,
  })).sort((a, b) => b.delta - a.delta)

  return {
    results,
    winner,
    runnerUp,
    margin: runnerUp ? round(winner.total - runnerUp.total) : 0,
    advantages: deltas.filter((item) => item.delta > 0).slice(0, 3),
    disadvantages: deltas.filter((item) => item.delta < 0).slice(-2).reverse(),
    sensitivity: sensitivityFor(decision, winner.id),
  }
}
