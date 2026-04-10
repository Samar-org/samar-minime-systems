/**
 * NanoBananaAdapter — Image generation via Google Gemini API (Nano Banana).
 *
 * Uses the Gemini generateContent endpoint with responseModalities: ["TEXT", "IMAGE"]
 * to produce images from text prompts.
 *
 * Requires: GEMINI_API_KEY (get from https://aistudio.google.com/apikey)
 */

export interface NanoBananaConfig {
  apiKey: string;
  model?: string; // default: gemini-2.0-flash-exp
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
    this.model = config.model ?? 'gemini-2.0-flash-exp';
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
      const error = await res.json().catch(() => ({}));
      throw new Error(
        `Nano Banana API error (${res.status}): ${JSON.stringify(error)}`
      );
    }

    const data = await res.json();

    // Extract image from response parts
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find(
      (p: any) => p.inlineData?.mimeType?.startsWith('image/')
    );

    if (!imagePart) {
      const textPart = parts.find((p: any) => p.text);
      throw new Error(
        `No image generated. Model response: ${textPart?.text ?? 'empty'}`
      );
    }

    return {
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
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
