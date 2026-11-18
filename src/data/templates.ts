import type { Decision } from '@/types/decision'

const stamp = () => new Date().toISOString()

export const decisionTemplates: { id: string; label: string; description: string; decision: Omit<Decision, 'updatedAt'> }[] = [
  {
    id: 'offer',
    label: '选择 Offer',
    description: '把成长、收入和生活方式放到同一张桌上。',
    decision: {
      version: 1,
      title: '下一份工作，我该怎么选？',
      context: '两份新机会都已进入最终沟通，也允许继续留在现岗位。希望做出的选择，三年后回看仍然成立。',
      options: [
        { id: 'chengchuan', name: '澄川科技', scores: { growth: 9, pay: 7, rhythm: 6, team: 8, stability: 6 } },
        { id: 'yuanfan', name: '远帆网络', scores: { growth: 6, pay: 9, rhythm: 4, team: 6, stability: 8 } },
        { id: 'stay', name: '留在现岗位', scores: { growth: 5, pay: 6, rhythm: 8, team: 8, stability: 7 } },
      ],
      criteria: [
        { id: 'growth', name: '成长空间', weight: 9 },
        { id: 'pay', name: '收入质量', weight: 8 },
        { id: 'rhythm', name: '工作节奏', weight: 7 },
        { id: 'team', name: '团队氛围', weight: 6 },
        { id: 'stability', name: '长期稳定', weight: 5 },
      ],
      uncertainty: 1,
      reflection: '',
    },
  },
  {
    id: 'laptop',
    label: '购买电脑',
    description: '不只看参数，也算清便携、预算和使用寿命。',
    decision: {
      version: 1,
      title: '下一台主力电脑买哪台？',
      context: '主要用于软件开发、偶尔视频剪辑，每周有两天需要携带出门，计划使用四年以上。',
      options: [
        { id: 'air', name: '轻薄本', scores: { performance: 6, portable: 10, budget: 8, screen: 7, longevity: 6 } },
        { id: 'pro', name: '高性能本', scores: { performance: 10, portable: 5, budget: 4, screen: 9, longevity: 9 } },
        { id: 'desktop', name: '台式机 + 旧本', scores: { performance: 9, portable: 3, budget: 7, screen: 10, longevity: 8 } },
      ],
      criteria: [
        { id: 'performance', name: '性能余量', weight: 8 },
        { id: 'portable', name: '便携程度', weight: 7 },
        { id: 'budget', name: '预算友好', weight: 8 },
        { id: 'screen', name: '屏幕体验', weight: 5 },
        { id: 'longevity', name: '使用寿命', weight: 7 },
      ],
      uncertainty: 1,
      reflection: '',
    },
  },
  {
    id: 'rent',
    label: '租房选择',
    description: '把通勤、居住品质和隐性成本一起比较。',
    decision: {
      version: 1,
      title: '这套房子值得搬进去吗？',
      context: '每天至少通勤一次，在家办公两天。除了房租，也在意睡眠、周边生活和未来一年的稳定性。',
      options: [
        { id: 'near', name: '公司旁小一居', scores: { commute: 10, space: 5, cost: 4, quiet: 6, life: 9 } },
        { id: 'river', name: '河边大两居', scores: { commute: 5, space: 9, cost: 6, quiet: 9, life: 7 } },
        { id: 'share', name: '朋友合租', scores: { commute: 7, space: 7, cost: 9, quiet: 5, life: 8 } },
      ],
      criteria: [
        { id: 'commute', name: '通勤轻松', weight: 9 },
        { id: 'space', name: '空间舒适', weight: 7 },
        { id: 'cost', name: '成本可控', weight: 8 },
        { id: 'quiet', name: '安静好眠', weight: 8 },
        { id: 'life', name: '生活便利', weight: 5 },
      ],
      uncertainty: 2,
      reflection: '',
    },
  },
  {
    id: 'stack',
    label: '技术选型',
    description: '让团队经验和维护成本进入技术讨论。',
    decision: {
      version: 1,
      title: '新项目该采用哪套技术方案？',
      context: '五人团队，预计六个月上线并维护三年。当前需求变化较快，没有高并发诉求。',
      options: [
        { id: 'familiar', name: '熟悉的全栈框架', scores: { delivery: 9, hiring: 8, ecosystem: 8, flexibility: 7, ops: 8 } },
        { id: 'new', name: '新兴高性能方案', scores: { delivery: 5, hiring: 4, ecosystem: 5, flexibility: 8, ops: 6 } },
        { id: 'services', name: '模块化微服务', scores: { delivery: 4, hiring: 6, ecosystem: 8, flexibility: 9, ops: 3 } },
      ],
      criteria: [
        { id: 'delivery', name: '交付速度', weight: 9 },
        { id: 'hiring', name: '团队熟悉度', weight: 8 },
        { id: 'ecosystem', name: '生态成熟度', weight: 7 },
        { id: 'flexibility', name: '长期扩展性', weight: 6 },
        { id: 'ops', name: '运维省心', weight: 8 },
      ],
      uncertainty: 1,
      reflection: '',
    },
  },
]

export function instantiateTemplate(index = 0): Decision {
  const source = decisionTemplates[index].decision
  return JSON.parse(JSON.stringify({ ...source, updatedAt: stamp() })) as Decision
}

export function blankDecision(): Decision {
  return {
    version: 1,
    title: '',
    context: '',
    options: [
      { id: crypto.randomUUID(), name: '选项 A', scores: {} },
      { id: crypto.randomUUID(), name: '选项 B', scores: {} },
    ],
    criteria: [
      { id: crypto.randomUUID(), name: '最重要的因素', weight: 8 },
      { id: crypto.randomUUID(), name: '次要因素', weight: 5 },
    ],
    uncertainty: 1,
    reflection: '',
    updatedAt: stamp(),
  }
}
