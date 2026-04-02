import { Asset, AssetLibrary, AssetSchema, AssetLibrarySchema } from '../models/asset.types';

export class AssetService {
  private libraries: Map<string, AssetLibrary> = new Map();

  createLibrary(library: AssetLibrary): void {
    const validated = AssetLibrarySchema.parse(library);
    this.libraries.set(validated.id, validated);
  }

  uploadAsset(libraryId: string, asset: Asset): void {
    const library = this.libraries.get(libraryId);
    if (library) {
      library.assets.push(AssetSchema.parse(asset));
    }
  }

  searchAssets(libraryId: string, query: string): Asset[] {
    const library = this.libraries.get(libraryId);
    if (!library) return [];
    return library.assets.filter(
      a => a.name.includes(query) || a.tags.some(t => t.includes(query))
    );
  }
}
