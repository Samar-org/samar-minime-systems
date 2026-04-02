import { PromptTemplateConfig, PromptVariableSchema, RenderVariables } from './types';

export class PromptRegistry {
  private templates: Map<string, PromptTemplateConfig> = new Map();

  constructor() {
    this.initializeBuiltInTemplates();
  }

  register(template: PromptTemplateConfig): void {
    if (this.templates.has(template.id)) {
      throw new Error(`Prompt template with id '${template.id}' already exists`);
    }
    this.templates.set(template.id, template);
  }

  get(id: string): PromptTemplateConfig | undefined {
    return this.templates.get(id);
  }

  render(id: string, variables: RenderVariables): string {
    const template = this.get(id);
    if (!template) {
      throw new Error(`Prompt template with id '${id}' not found`);
    }

    // Validate required variables
    for (const varDef of template.variables) {
      if (varDef.required && !(varDef.name in variables)) {
        throw new Error(`Missing required variable: ${varDef.name}`);
      }
    }

    // Replace {{variable}} placeholders
    let rendered = template.template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const stringValue =
        typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      rendered = rendered.replaceAll(placeholder, stringValue);
    }

    return rendered;
  }

  listByCategory(category: string): PromptTemplateConfig[] {
    const matching: PromptTemplateConfig[] = [];
    for (const template of this.templates.values()) {
      if (template.category === category) {
        matching.push(template);
      }
    }
    return matching;
  }

  list(): PromptTemplateConfig[] {
    return Array.from(this.templates.values());
  }

  async getFromDb(id: string): Promise<PromptTemplateConfig | null> {
    // In production, would fetch from Prisma PromptTemplate table
    // For now, return from in-memory storage
    return this.get(id) || null;
  }

  async syncToDb(template: PromptTemplateConfig): Promise<void> {
    // In production, would persist to Prisma PromptTemplate table
    this.register(template);
  }

  private initializeBuiltInTemplates(): void {
    // Register built-in templates
    this.register({
      id: 'research/market-scan',
      name: 'Market Scan',
      category: 'research',
      template: `Conduct a comprehensive market scan for {{market_segment}}.

Target audience: {{target_audience}}
Geographic focus: {{geography}}
Timeline: {{timeline}}

Deliverables:
- Market size and growth trends
- Key competitors and positioning
- Customer pain points
- Market entry barriers
- Growth opportunities

Format: JSON with findings and sources`,
      variables: [
        {
          name: 'market_segment',
          type: 'string',
          required: true,
          description: 'The market segment to research',
        },
        {
          name: 'target_audience',
          type: 'string',
          required: true,
          description: 'Target customer segment',
        },
        {
          name: 'geography',
          type: 'string',
          required: false,
          description: 'Geographic region',
          default: 'Global',
        },
        {
          name: 'timeline',
          type: 'string',
          required: false,
          description: 'Market timeline period',
          default: 'Current market',
        },
      ],
      version: 1,
    });

    this.register({
      id: 'research/competitor-analysis',
      name: 'Competitor Analysis',
      category: 'research',
      template: `Analyze competitors in {{market}}.

Companies to analyze: {{competitor_list}}
Analysis dimensions: {{dimensions}}

Provide:
- Product/service positioning
- Pricing strategy
- Target markets
- Strengths and weaknesses
- Market share estimates
- Differentiation opportunities`,
      variables: [
        {
          name: 'market',
          type: 'string',
          required: true,
          description: 'Market or industry',
        },
        {
          name: 'competitor_list',
          type: 'array',
          required: true,
          description: 'List of competitor names',
        },
        {
          name: 'dimensions',
          type: 'array',
          required: false,
          description: 'Analysis dimensions',
          default: ['product', 'pricing', 'marketing'],
        },
      ],
      version: 1,
    });

    this.register({
      id: 'ads/concept-generation',
      name: 'Ad Concept Generation',
      category: 'ads',
      template: `Generate ad concepts for {{product}}.

Target audience: {{audience}}
Platform: {{platform}}
Campaign goal: {{goal}}
Brand voice: {{brand_voice}}

Generate 3-5 distinct ad concepts with:
- Hook/headline
- Body copy
- Call to action
- Visual direction
- Expected performance rationale`,
      variables: [
        {
          name: 'product',
          type: 'string',
          required: true,
          description: 'Product or service to advertise',
        },
        {
          name: 'audience',
          type: 'string',
          required: true,
          description: 'Target audience description',
        },
        {
          name: 'platform',
          type: 'string',
          required: true,
          description: 'Ad platform (Facebook, LinkedIn, Google, etc.)',
        },
        {
          name: 'goal',
          type: 'string',
          required: true,
          description: 'Campaign goal (awareness, leads, sales)',
        },
        {
          name: 'brand_voice',
          type: 'string',
          required: false,
          description: 'Brand voice and tone',
          default: 'Professional',
        },
      ],
      version: 1,
    });

    this.register({
      id: 'creative/image-prompt',
      name: 'Image Generation Prompt',
      category: 'creative',
      template: `Generate an image prompt for {{concept}}.

Style: {{style}}
Medium: {{medium}}
Mood: {{mood}}
Key elements: {{elements}}

Create a detailed, visual image generation prompt (for DALL-E, Midjourney, etc.) that captures:
- Composition
- Color palette
- Lighting
- Textures
- Specific details`,
      variables: [
        {
          name: 'concept',
          type: 'string',
          required: true,
          description: 'Visual concept or subject',
        },
        {
          name: 'style',
          type: 'string',
          required: false,
          description: 'Art style',
          default: 'Modern',
        },
        {
          name: 'medium',
          type: 'string',
          required: false,
          description: 'Medium (photography, illustration, etc.)',
          default: 'Digital art',
        },
        {
          name: 'mood',
          type: 'string',
          required: false,
          description: 'Mood or atmosphere',
          default: 'Professional',
        },
        {
          name: 'elements',
          type: 'array',
          required: false,
          description: 'Key visual elements',
          default: [],
        },
      ],
      version: 1,
    });

    this.register({
      id: 'documentation/prd',
      name: 'Product Requirements Document',
      category: 'documentation',
      template: `Create a PRD for {{product_name}}.

Vision: {{vision}}
Target users: {{target_users}}
Key features: {{features}}
Success metrics: {{metrics}}

Structure:
1. Executive Summary
2. Problem Statement
3. Solution Overview
4. User Stories
5. Feature Specifications
6. Success Criteria
7. Timeline and Milestones`,
      variables: [
        {
          name: 'product_name',
          type: 'string',
          required: true,
          description: 'Product name',
        },
        {
          name: 'vision',
          type: 'string',
          required: true,
          description: 'Product vision statement',
        },
        {
          name: 'target_users',
          type: 'string',
          required: true,
          description: 'Target user description',
        },
        {
          name: 'features',
          type: 'array',
          required: true,
          description: 'Key features list',
        },
        {
          name: 'metrics',
          type: 'array',
          required: false,
          description: 'Success metrics',
          default: [],
        },
      ],
      version: 1,
    });

    this.register({
      id: 'seo/keyword-research',
      name: 'Keyword Research',
      category: 'seo',
      template: `Research keywords for {{topic}}.

Industry: {{industry}}
Target market: {{market}}
Content type: {{content_type}}

Analyze:
- Primary keywords and search volume
- Long-tail keywords
- Keyword difficulty
- Competitor keyword analysis
- Search intent classification
- Content gap opportunities`,
      variables: [
        {
          name: 'topic',
          type: 'string',
          required: true,
          description: 'Topic for keyword research',
        },
        {
          name: 'industry',
          type: 'string',
          required: true,
          description: 'Industry context',
        },
        {
          name: 'market',
          type: 'string',
          required: false,
          description: 'Target market',
          default: 'Global',
        },
        {
          name: 'content_type',
          type: 'string',
          required: false,
          description: 'Content type (blog, landing page, etc.)',
          default: 'Blog',
        },
      ],
      version: 1,
    });
  }
}
