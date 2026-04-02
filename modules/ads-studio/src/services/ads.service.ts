import { AdCreative, AdCampaign, AdCreativeSchema, AdCampaignSchema } from '../models/ads.types';

export class AdsService {
  private campaigns: Map<string, AdCampaign> = new Map();

  createCampaign(campaign: AdCampaign): void {
    const validated = AdCampaignSchema.parse(campaign);
    this.campaigns.set(validated.id, validated);
  }

  addCreative(campaignId: string, creative: AdCreative): void {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      campaign.creatives.push(AdCreativeSchema.parse(creative));
    }
  }

  getCampaign(id: string): AdCampaign | undefined {
    return this.campaigns.get(id);
  }

  listCampaigns(): AdCampaign[] {
    return Array.from(this.campaigns.values());
  }
}
