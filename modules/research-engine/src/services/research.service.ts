import { ResearchRequest, ResearchType, ResearchFinding } from '../models/research.types';

export class ResearchService {
  async createResearch(
    projectId: string,
    type: ResearchType,
    scope: string,
    parameters?: Record<string, any>
  ): Promise<ResearchRequest> {
    return {
      id: `res_${Date.now()}`,
      projectId,
      type,
      scope,
      parameters,
      findings: [],
      qualityScore: 0,
      createdAt: new Date()
    };
  }

  async getResearch(researchId: string): Promise<ResearchRequest | null> {
    // Placeholder implementation
    return null;
  }

  async updateFindings(
    researchId: string,
    findings: ResearchFinding[]
  ): Promise<ResearchRequest> {
    const qualityScore = this.calculateQualityScore(findings);
    return {
      id: researchId,
      projectId: '',
      type: 'MARKET_SCAN',
      scope: '',
      findings,
      qualityScore,
      createdAt: new Date(),
      completedAt: new Date()
    };
  }

  private calculateQualityScore(findings: ResearchFinding[]): number {
    if (findings.length === 0) return 0;
    const avgConfidence = findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length;
    return Math.round(avgConfidence);
  }

  getTierForResearchType(type: ResearchType): string {
    return type === 'OPPORTUNITY_RANKING' ? 'DIRECTOR' : 'BUILDER';
  }
}

export const researchService = new ResearchService();
