import { AgentConfig, AgentTier } from '@samar/schemas';

export const BUILT_IN_AGENTS: Record<string, AgentConfig> = {
  research: {
    name: 'Research Agent',
    description: 'Conducts market research, competitor analysis, and trend analysis',
    tier: AgentTier.ADVANCED,
    capabilities: ['market-analysis', 'competitor-research', 'trend-detection'],
    modelPreferences: {
      preferred: 'claude-3-opus',
      fallback: 'gpt-4o',
      budget: 'advanced',
    },
    constraints: {
      maxTokens: 8000,
      maxCost: 0.50,
    },
  },
  product: {
    name: 'Product Agent',
    description: 'Develops product requirements, user flows, and specification documents',
    tier: AgentTier.ADVANCED,
    capabilities: ['prd-generation', 'flow-design', 'specification'],
    modelPreferences: {
      preferred: 'claude-3-sonnet',
      fallback: 'gpt-4o',
      budget: 'standard',
    },
    constraints: {
      maxTokens: 6000,
      maxCost: 0.30,
    },
  },
  design: {
    name: 'Design Agent',
    description: 'Creates design systems, UI mockups, and interaction specifications',
    tier: AgentTier.STANDARD,
    capabilities: ['design-system', 'ui-mockup', 'interaction-spec'],
    modelPreferences: {
      preferred: 'claude-3-sonnet',
      fallback: 'gpt-4o',
      budget: 'standard',
    },
    constraints: {
      maxTokens: 4000,
      maxCost: 0.20,
    },
  },
  engineering: {
    name: 'Engineering Agent',
    description: 'Generates code, architectures, and technical specifications',
    tier: AgentTier.ADVANCED,
    capabilities: ['code-generation', 'architecture-design', 'tech-spec'],
    modelPreferences: {
      preferred: 'claude-3-opus',
      fallback: 'gpt-4o',
      budget: 'advanced',
    },
    constraints: {
      maxTokens: 8000,
      maxCost: 0.50,
    },
  },
  qa: {
    name: 'QA Agent',
    description: 'Designs test cases, security audits, and quality assurance strategies',
    tier: AgentTier.STANDARD,
    capabilities: ['test-design', 'security-audit', 'qa-strategy'],
    modelPreferences: {
      preferred: 'gpt-4o',
      fallback: 'claude-3-sonnet',
      budget: 'standard',
    },
    constraints: {
      maxTokens: 4000,
      maxCost: 0.20,
    },
  },
  marketing: {
    name: 'Marketing Agent',
    description: 'Creates marketing strategies, content, and campaign plans',
    tier: AgentTier.STANDARD,
    capabilities: ['strategy', 'content-creation', 'campaign-planning'],
    modelPreferences: {
      preferred: 'gpt-4o',
      fallback: 'claude-3-sonnet',
      budget: 'standard',
    },
    constraints: {
      maxTokens: 3000,
      maxCost: 0.15,
    },
  },
};
