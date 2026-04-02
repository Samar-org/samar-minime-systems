import { Campaign, CampaignStatus } from '../models/campaign.types';

export class CampaignService {
  async createCampaign(
    name: string,
    objective: string,
    budget: number,
    channels: string[]
  ): Promise<Campaign> {
    return {
      id: `camp_${Date.now()}`,
      name,
      status: 'PLANNING',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      objective,
      targetAudience: [],
      budget,
      channels,
      metrics: {
        reach: 0,
        engagement: 0,
        conversions: 0,
        roi: 0
      }
    };
  }

  async launchCampaign(campaign: Campaign): Promise<Campaign> {
    return {
      ...campaign,
      status: 'ACTIVE',
      startDate: new Date()
    };
  }

  async pauseCampaign(campaign: Campaign): Promise<Campaign> {
    return {
      ...campaign,
      status: 'PAUSED'
    };
  }
}

export const campaignService = new CampaignService();
