import { Ad, AdFormat } from '../models/ads.types';

export class AdsService {
  async createAd(
    format: AdFormat,
    headline: string,
    description: string,
    creative: string,
    budget: number
  ): Promise<Ad> {
    return {
      id: `ad_${Date.now()}`,
      format,
      headline,
      description,
      creative,
      targetAudience: [],
      budget,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'DRAFT',
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0
      }
    };
  }

  async publishAd(ad: Ad): Promise<Ad> {
    return {
      ...ad,
      status: 'ACTIVE'
    };
  }

  calculateCTR(ad: Ad): number {
    if (!ad.metrics || ad.metrics.impressions === 0) return 0;
    return (ad.metrics.clicks / ad.metrics.impressions) * 100;
  }
}

export const adsService = new AdsService();
