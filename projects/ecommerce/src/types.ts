export interface EcommerceProject {
  id: string;
  name: string;
  storeUrl: string;
  apiKey: string;
  config: {
    productCategories: string[];
    targetAudience: string;
    budget: number;
    currency: string;
  };
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
}

export interface Campaign {
  id: string;
  name: string;
  products: string[];
  channels: string[];
  budget: number;
  startDate: string;
  endDate: string;
}

export interface ContentCalendar {
  id: string;
  projectId: string;
  items: Array<{
    date: string;
    channel: string;
    content: string;
    status: 'draft' | 'scheduled' | 'published';
  }>;
}
