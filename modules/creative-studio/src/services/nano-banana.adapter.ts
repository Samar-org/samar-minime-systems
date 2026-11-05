/**
 * NanoBananaAdapter — Image generation via Google Gemini API (Nano Banana).
 *
 * Uses the Gemini generateContent endpoint with responseModalities: ["TEXT", "IMAGE"]
 * to produce images from text prompts.
 *
 * Requires: GEMINI_API_KEY (get from https://aistudio.google.com/apikey)
 */

import { z } from 'zod';

const imageResponseSchema=z.object({candidates:z.array(z.object({content:z.object({parts:z.array(
 z.object({inlineData:z.object({mimeType:z.string(),data:z.string().min(1)}).optional(),text:z.string().optional()})
)})})).min(1)});

/** Validate provider data without exposing response text in errors. */
export function parseGeneratedImage(payload:unknown):{imageBase64:string;mimeType:string} {
 const parsed=imageResponseSchema.safeParse(payload);
 if(!parsed.success)throw new Error('No valid image generated');
 const image=parsed.data.candidates[0].content.parts.find(part=>part.inlineData?.mimeType.startsWith('image/'))?.inlineData;
 if(!image)throw new Error('No valid image generated');
 return {imageBase64:image.data,mimeType:image.mimeType};
}

export interface NanoBananaConfig {
  apiKey: string;
  model?: string; // default: gemini-2.5-flash-image
  baseUrl?: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  style?: 'photorealistic' | 'digital-art' | 'illustration' | 'minimalist' | 'branded';
  referenceImageUrls?: string[];
}

export interface ImageGenerationResult {
  imageBase64: string;
  mimeType: string;
  prompt: string;
  model: string;
  generatedAt: Date;
}

export class NanoBananaAdapter {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: NanoBananaConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'gemini-2.5-flash-image';
    this.baseUrl = config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
  }

  /**
   * Generate an image from a text prompt.
   */
  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const enhancedPrompt = this.buildPrompt(request);

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          parts: [{ text: enhancedPrompt }],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Image provider request failed (${res.status})`);
    }

    const image = parseGeneratedImage(await res.json());

    return {
      imageBase64: image.imageBase64,
      mimeType: image.mimeType,
      prompt: enhancedPrompt,
      model: this.model,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate multiple variations of the same prompt.
   */
  async generateVariations(
    request: ImageGenerationRequest,
    count: number = 3
  ): Promise<ImageGenerationResult[]> {
    const results: ImageGenerationResult[] = [];
    for (let i = 0; i < count; i++) {
      const variation = {
        ...request,
        prompt: `${request.prompt} (variation ${i + 1} of ${count}, unique creative interpretation)`,
      };
      results.push(await this.generate(variation));
    }
    return results;
  }

  /**
   * Check if the API key is valid and the service is reachable.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/models/${this.model}?key=${this.apiKey}`;
      const res = await fetch(url);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Build an enhanced prompt with style and size hints.
   */
  private buildPrompt(request: ImageGenerationRequest): string {
    const parts: string[] = [request.prompt];

    if (request.style) {
      const styleMap: Record<string, string> = {
        'photorealistic': 'photorealistic, high detail, professional photography',
        'digital-art': 'digital art style, vibrant colors, clean lines',
        'illustration': 'illustration style, hand-drawn feel, artistic',
        'minimalist': 'minimalist design, clean, simple, modern',
        'branded': 'professional branded marketing material, clean layout',
      };
      parts.push(styleMap[request.style] ?? '');
    }

    if (request.width && request.height) {
      const aspect = request.width > request.height ? 'landscape' : 'portrait';
      parts.push(`${aspect} orientation, ${request.width}x${request.height}`);
    }

    if (request.negativePrompt) {
      parts.push(`Avoid: ${request.negativePrompt}`);
    }

    return parts.filter(Boolean).join('. ');
  }
}
