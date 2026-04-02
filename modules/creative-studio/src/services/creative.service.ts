import { Creative, CreativeType } from '../models/creative.types';

export class CreativeService {
  async createCreative(
    title: string,
    type: CreativeType,
    content: string,
    author: string
  ): Promise<Creative> {
    return {
      id: `crv_${Date.now()}`,
      title,
      type,
      content,
      status: 'DRAFT',
      author,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async submitForReview(creative: Creative): Promise<Creative> {
    return {
      ...creative,
      status: 'REVIEW',
      updatedAt: new Date()
    };
  }

  async approveCreative(creative: Creative): Promise<Creative> {
    return {
      ...creative,
      status: 'APPROVED',
      updatedAt: new Date()
    };
  }
}

export const creativeService = new CreativeService();
