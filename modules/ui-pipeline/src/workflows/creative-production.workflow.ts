import { CreativeStrategistAgent } from '../agents/creative-strategist.agent';
import { CreativeBuilderAgent } from '../agents/creative-builder.agent';

export class CreativeProductionWorkflow {
  private strategist: CreativeStrategistAgent;
  private builder: CreativeBuilderAgent;

  constructor() {
    this.strategist = new CreativeStrategistAgent();
    this.builder = new CreativeBuilderAgent();
  }

  async execute(briefing: string): Promise<{ assets: string[] }> {
    // Step 1: Develop creative strategy
    const strategy = await this.strategist.developStrategy(briefing);

    // Step 2: Validate strategy
    const isValid = await this.strategist.validateStrategy(strategy);
    if (!isValid) throw new Error('Invalid strategy');

    // Step 3: Build visuals
    await this.builder.buildVisuals(strategy);

    // Step 4: Generate assets
    const assets = await this.builder.generateAssets(strategy);

    // Step 5: Optimize for web
    const optimized = await this.builder.optimizeForWeb(assets);

    return { assets: optimized };
  }
}
