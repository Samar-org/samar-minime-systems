export interface MarketplaceProject {
  id: string;
  name: string;
  platforms: string[];
  config: {
    categories: string[];
    vendorReviewThreshold: number;
    commissionPercentage: number;
    payoutSchedule: 'daily' | 'weekly' | 'monthly';
  };
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'active' | 'suspended';
  rating: number;
  reviews: number;
}

export interface MarketplaceProduct {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
}

export interface GrowthMetrics {
  activeVendors: number;
  activeProducts: number;
  gmv: number; // Gross Merchandise Value
  conversionRate: number;
  averageOrderValue: number;
}
