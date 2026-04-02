import { Campaign, CampaignMetrics, CampaignSchema, CampaignMetricsSchema } from '../models/campaign.types';

export class CampaignService {
  private campaigns: Map<string, Campaign> = new Map();
  private metrics: Map<string, CampaignMetrics> = new Map();

  createCampaign(campaign: Campaign): void {
    const validated = CampaignSchema.parse(campaign);
    this.campaigns.set(validated.id, validated);
  }

  getCampaign(id: string): Campaign | undefined {
    return this.campaigns.get(id);
  }

  recordMetrics(metrics: CampaignMetrics): void {
    const validated = CampaignMetricsSchema.parse(metrics);
    this.metrics.set(validated.campaignId, validated);
  }

  getCampaignMetrics(campaignId: string): CampaignMetrics | undefined {
    return this.metrics.get(campaignId);
  }
}
