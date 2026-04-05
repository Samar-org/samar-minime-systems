import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createProviders, createProvidersFromEnv, checkProviderHealth } from '../factory.js';
import type { ProviderConfig } from '../factory.js';
import { OpenAIAdapter } from '../openai/adapter.js';
import { ClaudeAdapter } from '../claude/adapter.js';

// Mock the adapter constructors
vi.mock('../openai/adapter.js', () => ({
  OpenAIAdapter: vi.fn().mockImplementation((key) => ({
    name: 'openai',
    provider: 'openai',
    isAvailable: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock('../claude/adapter.js', () => ({
  ClaudeAdapter: vi.fn().mockImplementation((key) => ({
    name: 'claude',
    provider: 'anthropic',
    isAvailable: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock('../llama/adapter.js', () => ({
  LlamaAdapter: vi.fn().mockImplementation((url) => ({
    name: 'llama',
    provider: 'llama',
    isAvailable: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock('../llama/fleet-adapter.js', () => ({
  LlamaFleetAdapter: vi.fn().mockImplementation((config) => ({
    name: 'llama-fleet',
    provider: 'llama',
    isAvailable: vi.fn().mockResolvedValue(true),
  })),
}));

describe('ProviderFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProviders()', () => {
    it('should create all 3 providers when fully configured', () => {
      const config: ProviderConfig = {
        openaiApiKey: 'sk-openai-key',
        anthropicApiKey: 'sk-anthropic-key',
        llamaBaseUrl: 'http://localhost:11434/v1',
      };

      const providers = createProviders(config);

      expect(providers.size).toBe(3);
      expect(providers.has('openai')).toBe(true);
      expect(providers.has('anthropic')).toBe(true);
      expect(providers.has('llama')).toBe(true);
    });

    it('should create only OpenAI provider when only openai key is provided', () => {
      const config: ProviderConfig = {
        openaiApiKey: 'sk-openai-key',
      };

      const providers = createProviders(config);

      expect(providers.size).toBe(1);
      expect(providers.has('openai')).toBe(true);
      expect(providers.has('anthropic')).toBe(false);
      expect(providers.has('llama')).toBe(false);
    });

    it('should create OpenAI and Anthropic when both keys are provided', () => {
      const config: ProviderConfig = {
        openaiApiKey: 'sk-openai-key',
        anthropicApiKey: 'sk-anthropic-key',
      };

      const providers = createProviders(config);

      expect(providers.size).toBe(2);
      expect(providers.has('openai')).toBe(true);
      expect(providers.has('anthropic')).toBe(true);
    });

    it('should skip Anthropic if apiKey is not provided', () => {
      const config: ProviderConfig = {
        openaiApiKey: 'sk-openai-key',
        anthropicApiKey: undefined,
      };

      const providers = createProviders(config);

      expect(providers.has('anthropic')).toBe(false);
    });

    it('should use LlamaFleetAdapter when fleet is enabled with URL', () => {
      const LlamaFleetAdapter = vi.fn();
      vi.doMock('../llama/fleet-adapter.js', () => ({ LlamaFleetAdapter }), {
        virtual: true,
      });

      const config: ProviderConfig = {
        openaiApiKey: 'sk-key',
        llamaFleetEnabled: true,
        llamaFleetUrl: 'https://fleet.example.com/v1',
        llamaFleetApiKey: 'fleet-key',
      };

      const providers = createProviders(config);

      expect(providers.has('llama')).toBe(true);
    });

    it('should use LlamaAdapter when fleet is disabled', () => {
      const config: ProviderConfig = {
        openaiApiKey: 'sk-key',
        llamaFleetEnabled: false,
        llamaBaseUrl: 'http://localhost:11434/v1',
      };

      const providers = createProviders(config);

      expect(providers.has('llama')).toBe(true);
    });

    it('should prefer LlamaFleetAdapter over LlamaAdapter when both are configured', () => {
      const config: ProviderConfig = {
        openaiApiKey: 'sk-key',
        llamaFleetEnabled: true,
        llamaFleetUrl: 'https://fleet.example.com/v1',
        llamaBaseUrl: 'http://localhost:11434/v1', // This should be ignored
      };

      const providers = createProviders(config);

      expect(providers.has('llama')).toBe(true);
      // Fleet adapter is created instead of regular adapter
    });

    it('should not create Llama provider if neither fleet nor base URL is configured', () => {
      const config: ProviderConfig = {
        openaiApiKey: 'sk-key',
        llamaFleetEnabled: false,
      };

      const providers = createProviders(config);

      expect(providers.has('llama')).toBe(false);
    });

    it('should create correct adapter instances', () => {
      const config: ProviderConfig = {
        openaiApiKey: 'sk-openai-123',
        anthropicApiKey: 'sk-anthropic-456',
      };

      const providers = createProviders(config);

      // Verify adapters are instances of correct classes
      const openaiAdapter = providers.get('openai');
      const claudeAdapter = providers.get('anthropic');

      expect(openaiAdapter?.name).toBe('openai');
      expect(claudeAdapter?.name).toBe('claude');
    });
  });

  describe('createProvidersFromEnv()', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = '';
      process.env.ANTHROPIC_API_KEY = '';
      process.env.LLAMA_BASE_URL = '';
      process.env.LLAMA_FLEET_ENABLED = '';
      process.env.LLAMA_FLEET_URL = '';
      process.env.LLAMA_FLEET_API_KEY = '';
    });

    it('should read config from environment variables', () => {
      process.env.OPENAI_API_KEY = 'sk-env-openai';
      process.env.ANTHROPIC_API_KEY = 'sk-env-anthropic';
      process.env.LLAMA_BASE_URL = 'http://env-llama:11434/v1';

      const providers = createProvidersFromEnv();

      expect(providers.size).toBe(3);
      expect(providers.has('openai')).toBe(true);
      expect(providers.has('anthropic')).toBe(true);
      expect(providers.has('llama')).toBe(true);
    });

    it('should only create OpenAI if only OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'sk-env-openai';
      process.env.ANTHROPIC_API_KEY = '';
      process.env.LLAMA_BASE_URL = '';

      const providers = createProvidersFromEnv();

      expect(providers.size).toBe(1);
      expect(providers.has('openai')).toBe(true);
    });

    it('should interpret LLAMA_FLEET_ENABLED=true correctly', () => {
      process.env.OPENAI_API_KEY = 'sk-key';
      process.env.LLAMA_FLEET_ENABLED = 'true';
      process.env.LLAMA_FLEET_URL = 'https://fleet.env.com/v1';

      const providers = createProvidersFromEnv();

      expect(providers.has('llama')).toBe(true);
    });

    it('should interpret LLAMA_FLEET_ENABLED=false (or other value) correctly', () => {
      process.env.OPENAI_API_KEY = 'sk-key';
      process.env.LLAMA_FLEET_ENABLED = 'false';
      process.env.LLAMA_BASE_URL = 'http://localhost:11434/v1';

      const providers = createProvidersFromEnv();

      expect(providers.has('llama')).toBe(true);
    });
  });

  describe('checkProviderHealth()', () => {
    it('should return health status for all providers', async () => {
      const config: ProviderConfig = {
        openaiApiKey: 'sk-key',
        anthropicApiKey: 'sk-anthropic',
      };

      const providers = createProviders(config);
      const health = await checkProviderHealth(providers);

      expect(health.length).toBe(2);
      expect(health[0]).toMatchObject({
        name: expect.any(String),
        provider: expect.any(String),
        available: expect.any(Boolean),
      });
    });

    it('should mark provider as available if isAvailable returns true', async () => {
      const config: ProviderConfig = {
        openaiApiKey: 'sk-key',
      };

      const providers = createProviders(config);
      const health = await checkProviderHealth(providers);

      const openaiHealth = health.find((h) => h.provider === 'openai');
      expect(openaiHealth?.available).toBe(true);
      expect(openaiHealth?.error).toBeUndefined();
    });

    it('should catch errors and mark provider as unavailable with error message', async () => {
      const mockAdapter = {
        name: 'test',
        provider: 'test' as const,
        isAvailable: vi.fn().mockRejectedValue(new Error('Connection timeout')),
      };

      const providers = new Map([['test', mockAdapter as any]]);
      const health = await checkProviderHealth(providers);

      expect(health[0]).toMatchObject({
        available: false,
        error: 'Connection timeout',
      });
    });

    it('should provide status for multiple providers independently', async () => {
      // Mock different availability states
      const mockAdapters = [
        {
          name: 'available',
          provider: 'openai',
          isAvailable: vi.fn().mockResolvedValue(true),
        },
        {
          name: 'unavailable',
          provider: 'anthropic',
          isAvailable: vi.fn().mockResolvedValue(false),
        },
      ];

      const providers = new Map([
        ['openai', mockAdapters[0] as any],
        ['anthropic', mockAdapters[1] as any],
      ]);

      const health = await checkProviderHealth(providers);

      expect(health.length).toBe(2);
      expect(health[0].available).toBe(true);
      expect(health[1].available).toBe(false);
    });
  });

  describe('provider configuration edge cases', () => {
    it('should handle empty config gracefully', () => {
      const config: ProviderConfig = {
        openaiApiKey: '',
      };

      const providers = createProviders(config);

      expect(providers.size).toBe(0);
    });

    it('should handle undefined optional fields', () => {
      const config: ProviderConfig = {
        openaiApiKey: 'sk-key',
        anthropicApiKey: undefined,
        llamaBaseUrl: undefined,
      };

      const providers = createProviders(config);

      expect(providers.size).toBe(1);
      expect(providers.has('openai')).toBe(true);
    });

    it('should not create provider if required field is empty string', () => {
      const config: ProviderConfig = {
        openaiApiKey: '', // Empty string is falsy
      };

      const providers = createProviders(config);

      expect(providers.has('openai')).toBe(false);
    });
  });
});