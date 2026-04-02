import { getLogger } from './logger';

const logger = getLogger('cost-tracker');

export interface CostEvent {
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

export class CostTracker {
  private costs: CostEvent[] = [];

  track(event: CostEvent): void {
    logger.debug('Cost event tracked', {
      model: event.modelId,
      cost: event.cost,
      tokens: event.inputTokens + event.outputTokens,
    });
    this.costs.push(event);
  }

  getTotalCost(): number {
    return this.costs.reduce((sum, e) => sum + e.cost, 0);
  }

  getCostsByModel(): Record<string, number> {
    return this.costs.reduce(
      (acc, e) => {
        acc[e.modelId] = (acc[e.modelId] || 0) + e.cost;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
