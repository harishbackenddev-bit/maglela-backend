// config/ai-cost-config.ts

export interface AIModelConfig {
  name: string;
  displayName: string;
  provider: 'anthropic' | 'openai' | 'google';
  modelId: string;
  inputCostPerMillion: number; // USD per million input tokens
  outputCostPerMillion: number; // USD per million output tokens
  description: string;
  bestFor: string;
  isRecommended: boolean;
}

export interface SupportPlan {
  name: string;
  hoursPerMonth: number;
  monthlyCostUSD: number;
  monthlyCostZAR: number;
  description: string;
  features: string[];
  responseTime: string;
}

export interface CostEstimate {
  scenario: string;
  users: number;
  draftsPerUser: number;
  aiCostUSD: number;
  aiCostZAR: number;
  supportCostUSD: number;
  supportCostZAR: number;
  infrastructureCostUSD: number;
  infrastructureCostZAR: number;
  totalUSD: number;
  totalZAR: number;
}

// Exchange rate
export const EXCHANGE_RATE = 16.60; // 1 USD = R16.60 (March 2026)

// AI Models Configuration
export const AI_MODELS: AIModelConfig[] = [
  {
    name: 'claude-sonnet-4.6',
    displayName: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    inputCostPerMillion: 3.00,
    outputCostPerMillion: 15.00,
    description: 'Deep research drafts, long documents, voice matching',
    bestFor: 'Final quality drafts, policy briefs, op-eds, impact reports',
    isRecommended: true,
  },
  {
    name: 'gpt-4o',
    displayName: 'GPT-4o',
    provider: 'openai',
    modelId: 'gpt-4o',
    inputCostPerMillion: 2.50,
    outputCostPerMillion: 10.00,
    description: 'Structured summaries, classification, reliable outputs',
    bestFor: 'Quick summaries, sorting, media stories',
    isRecommended: true,
  },
  {
    name: 'claude-haiku-4.5',
    displayName: 'Claude Haiku 4.5',
    provider: 'anthropic',
    modelId: 'claude-3-5-haiku-20241022',
    inputCostPerMillion: 1.00,
    outputCostPerMillion: 5.00,
    description: 'Fast, simple tasks — routing, tagging, extraction',
    bestFor: 'Background processing, routing, simple extractions',
    isRecommended: true,
  },
  {
    name: 'google-gemini-flash',
    displayName: 'Google Gemini Flash',
    provider: 'google',
    modelId: 'gemini-1.5-flash',
    inputCostPerMillion: 0.60,
    outputCostPerMillion: 2.40,
    description: 'High-volume batch work at very low cost',
    bestFor: 'Bulk processing only',
    isRecommended: false,
  },
];

// Support Plans
export const SUPPORT_PLANS: SupportPlan[] = [
  {
    name: 'Lean',
    hoursPerMonth: 8,
    monthlyCostUSD: 480,
    monthlyCostZAR: 7968,
    description: 'Basic monitoring and support for early pilot phase',
    features: [
      'Monthly security checks',
      'Basic monitoring',
      'Quarterly cost review',
      'Email response within 48 hours',
    ],
    responseTime: '48 hours',
  },
  {
    name: 'Standard',
    hoursPerMonth: 16,
    monthlyCostUSD: 960,
    monthlyCostZAR: 15936,
    description: 'Recommended for launch - balances cost with reliable care',
    features: [
      'Weekly monitoring & alerts',
      'Security patching',
      'Monthly backup tests',
      'Response within 24 hours',
      '90-day cost review',
    ],
    responseTime: '24 hours',
  },
  {
    name: 'Enterprise',
    hoursPerMonth: 32,
    monthlyCostUSD: 2560,
    monthlyCostZAR: 42496,
    description: 'For institutional clients where uptime is mission-critical',
    features: [
      'Daily monitoring',
      'Rapid incident response',
      'Dedicated support contact',
      'Response within 4 hours',
      'Proactive optimisation',
    ],
    responseTime: '4 hours',
  },
];

// Infrastructure Costs
export const INFRASTRUCTURE_COST = {
  monthlyUSD: 147,
  monthlyZAR: 2440,
  description: 'Cloud infrastructure - servers, database, file storage, security',
};

// AI Usage Estimates
export const AI_USAGE_ESTIMATES = {
  // Average tokens per document type
  tokensPerDraft: {
    'policy-brief': 1500,
    'op-ed': 1200,
    'impact-report': 2000,
    'speech': 1800,
    'press-release': 800,
    'summary': 500,
    'media-story': 600,
    'blog-post': 1000,
  },
  // Average cost per draft (USD)
  costPerDraft: {
    'policy-brief': 0.09,
    'op-ed': 0.07,
    'impact-report': 0.12,
    'speech': 0.10,
    'press-release': 0.05,
    'summary': 0.03,
    'media-story': 0.04,
    'blog-post': 0.06,
  },
};

// Document Types
export const DOCUMENT_TYPES = [
  { value: 'policy-brief', label: 'Policy Brief' },
  { value: 'op-ed', label: 'Op-Ed' },
  { value: 'impact-report', label: 'Impact Report' },
  { value: 'speech', label: 'Speech' },
  { value: 'press-release', label: 'Press Release' },
  { value: 'summary', label: 'Summary' },
  { value: 'media-story', label: 'Media Story' },
  { value: 'blog-post', label: 'Blog Post' },
];

// Tone Options
export const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'accessible', label: 'Accessible' },
  { value: 'persuasive', label: 'Persuasive' },
  { value: 'neutral', label: 'Neutral' },
];

// Calculate cost for a draft
export const calculateDraftCost = (
  modelName: string,
  inputTokens: number,
  outputTokens: number
): { usd: number; zar: number } => {
  const model = AI_MODELS.find(m => m.name === modelName);
  if (!model) {
    throw new Error(`Model ${modelName} not found`);
  }

  const costUSD = (inputTokens / 1_000_000) * model.inputCostPerMillion +
    (outputTokens / 1_000_000) * model.outputCostPerMillion;

  return {
    usd: parseFloat(costUSD.toFixed(4)),
    zar: parseFloat((costUSD * EXCHANGE_RATE).toFixed(2)),
  };
};

// Get monthly cost estimate
export const getMonthlyCostEstimate = (
  users: number,
  draftsPerUser: number,
  supportPlan: 'lean' | 'standard' | 'enterprise' = 'standard'
): CostEstimate => {
  const totalDrafts = users * draftsPerUser;
  
  // Average cost per draft (mix of Claude Sonnet and GPT-4o)
  const avgCostPerDraftUSD = 0.09;
  const aiCostUSD = totalDrafts * avgCostPerDraftUSD;
  const aiCostZAR = aiCostUSD * EXCHANGE_RATE;

  const support = SUPPORT_PLANS.find(p => 
    p.name.toLowerCase() === supportPlan
  ) || SUPPORT_PLANS[1];

  const totalUSD = aiCostUSD + support.monthlyCostUSD + INFRASTRUCTURE_COST.monthlyUSD;
  const totalZAR = aiCostZAR + support.monthlyCostZAR + INFRASTRUCTURE_COST.monthlyZAR;

  const scenarioNames: Record<string, string> = {
    lean: 'Conservative',
    standard: 'Typical',
    enterprise: 'Heavy',
  };

  return {
    scenario: scenarioNames[supportPlan] || 'Typical',
    users,
    draftsPerUser,
    aiCostUSD: parseFloat(aiCostUSD.toFixed(2)),
    aiCostZAR: parseFloat(aiCostZAR.toFixed(2)),
    supportCostUSD: support.monthlyCostUSD,
    supportCostZAR: support.monthlyCostZAR,
    infrastructureCostUSD: INFRASTRUCTURE_COST.monthlyUSD,
    infrastructureCostZAR: INFRASTRUCTURE_COST.monthlyZAR,
    totalUSD: parseFloat(totalUSD.toFixed(2)),
    totalZAR: parseFloat(totalZAR.toFixed(2)),
  };
};

// Get all cost scenarios
export const getAllCostScenarios = (users: number = 50, draftsPerUser: number = 20) => {
  return {
    conservative: getMonthlyCostEstimate(users, draftsPerUser, 'lean'),
    typical: getMonthlyCostEstimate(users, draftsPerUser, 'standard'),
    heavy: getMonthlyCostEstimate(users, draftsPerUser, 'enterprise'),
  };
};

// Get model recommendation based on document type
export const getModelForDocumentType = (type: string): string => {
  const complexTypes = ['policy-brief', 'op-ed', 'impact-report', 'speech'];
  const summaryTypes = ['summary', 'media-story'];

  if (complexTypes.includes(type)) {
    return 'claude-sonnet-4.6';
  } else if (summaryTypes.includes(type)) {
    return 'gpt-4o';
  } else {
    return 'claude-haiku-4.5';
  }
};

// Export default config
export default {
  EXCHANGE_RATE,
  AI_MODELS,
  SUPPORT_PLANS,
  INFRASTRUCTURE_COST,
  AI_USAGE_ESTIMATES,
  DOCUMENT_TYPES,
  TONE_OPTIONS,
  calculateDraftCost,
  getMonthlyCostEstimate,
  getAllCostScenarios,
  getModelForDocumentType,
};