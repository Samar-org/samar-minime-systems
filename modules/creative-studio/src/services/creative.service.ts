import { CreativeAsset, CreativeProject, CreativeAssetSchema, CreativeProjectSchema } from '../models/creative.types';

export class CreativeService {
  private assets: Map<string, CreativeAsset> = new Map();
  private projects: Map<string, CreativeProject> = new Map();

  uploadAsset(asset: CreativeAsset): void {
    const validated = CreativeAssetSchema.parse(asset);
    this.assets.set(validated.id, validated);
  }

  createProject(project: CreativeProject): void {
    const validated = CreativeProjectSchema.parse(project);
    this.projects.set(validated.id, validated);
  }

  getProject(id: string): CreativeProject | undefined {
    return this.projects.get(id);
  }

  getAssetsByTag(tag: string): CreativeAsset[] {
    return Array.from(this.assets.values()).filter(a => a.tags.includes(tag));
  }
}
