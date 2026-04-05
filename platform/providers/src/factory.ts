/**
 * ProviderFactory — Creates and wires all provider adapters from environment config.
 * Single source of truth for provider initialization.
 */

import type { ProviderAdapter } from './types.js';
import { OpenAIAdapter } from './openai/adapter.js';
import { ClaudeAdapter } from './claude/adapter.js';
import { LlamaAdapter } from './llama/adapter.js';
import { LlamaFleetAdapter } from './llama/fleet-adapter.js';

export interface ProviderConfig {
  // OpenAI
  openaiApiKey: string;

  // Anthropic (optional — if not set, Claude models won't be available)
  anthropicApiKey?: string;

  // Llama (local Ollama)
  llamaBaseUrl?: string;

  // Llama Fleet (hosted vLLM cluster)
  llamaFleetEnabled?: boolean;
  llamaFleetUrl?: string;
  llamaFleetApiKey?: string;
}

export interface ProviderStatus {
  name: string;
  provider: string;
  available: boolean;
  error?: string;
}

/**
 * Build a Map<string, ProviderAdapter> from config.
 * Keys are provider identifiers used in the ModelRegistry: 'openai', 'anthropic', 'llama'.
 */
export function createProviders(config: ProviderConfig): Map<string, ProviderAdapter> {
  const providers = new Map<string, ProviderAdapter>();

  // ── OpenAI (required) ─────────────────────────────────────────────────
  if (config.openaiApiKey) {
    providers.set('openai', new OpenAIAdapter(config.openaiApiKey));
  }

  // ── Anthropic (optional) ──────────────────────────────────────────────
  if (config.anthropicApiKey) {
    providers.set('anthropic', new ClaudeAdapter(config.anthropicApiKey));
  }

  // ── Llama (fleet or local Ollama) ─────────────────────────────────────
  if (config.llamaFleetEnabled && config.llamaFleetUrl) {
    // Use fleet adapter with Ollama fallback
    providers.set(
      'llama',
      new LlamaFleetAdapter({
        fleetUrl: config.llamaFleetUrl,
        fleetApiKey: config.llamaFleetApiKey,
        ollamaUrl: config.llamaBaseUrl ?? 'http://localhost:11434/v1',
      }),
    );
  } else if (config.llamaBaseUrl) {
    // Direct Ollama connection
    providers.set('llama', new LlamaAdapter(config.llamaBaseUrl));
  }

  return providers;
}

/**
 * Build providers from process.env (convenience for Temporal worker).
 */
export function createProvidersFromEnv(): Map<string, ProviderAdapter> {
  return createProviders({
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    llamaBaseUrl: process.env.LLAMA_BASE_URL,
    llamaFleetEnabled: process.env.LLAMA_FLEET_ENABLED === 'true',
    llamaFleetUrl: process.env.LLAMA_FLEET_URL,
    llamaFleetApiKey: process.env.LLAMA_FLEET_API_KEY,
  });
}

/**
 * Health check all configured providers.
 */
export async function checkProviderHealth(
  providers: Map<string, ProviderAdapter>,
): Promise<ProviderStatus[]> {
  const results: ProviderStatus[] = [];

  for (const [key, adapter] of providers) {
    try {
      const available = await adapter.isAvailable();
      results.push({
        name: adapter.name,
        provider: key,
        available,
      });
    } catch (error: any) {
      results.push({
        name: adapter.name,
        provider: key,
        available: false,
        error: error.message,
      });
    }
  }

  return results;
}
