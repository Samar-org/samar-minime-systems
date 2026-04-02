import { UISpec } from '../models/ui-spec';
import { UIArchitectAgent } from '../agents/ui-architect.agent';
import { UIBuilderAgent } from '../agents/ui-builder.agent';
import { UIRefinementAgent } from '../agents/ui-refinement.agent';

export class UIGenerationWorkflow {
  private architect: UIArchitectAgent;
  private builder: UIBuilderAgent;
  private refinement: UIRefinementAgent;

  constructor(projectId: string) {
    this.architect = new UIArchitectAgent({ projectId, tier: 'BUILDER' });
    this.builder = new UIBuilderAgent();
    this.refinement = new UIRefinementAgent();
  }

  async execute(requirements: string): Promise<UISpec> {
    // Step 1: Architect designs the structure
    const spec = await this.architect.designUIStructure(requirements);

    // Step 2: Validate structure
    const isValid = await this.architect.validateStructure(spec);
    if (!isValid) throw new Error('Invalid UI structure');

    // Step 3: Build components
    const components = await this.builder.buildComponents(spec);

    // Step 4: Refine design
    const refined = await this.refinement.optimizeForResponsiveness({
      ...spec,
      components
    });

    return refined;
  }
}
