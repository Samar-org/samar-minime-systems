import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OpenAIAdapter } from '../openai/adapter.js';
import type { CompletionRequest, CompletionResponse } from '../types.js';

// Mock OpenAI SDK
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    const OpenAI = require('openai').default;
    const mockClient = new OpenAI({ apiKey: 'test-key' });
    mockCreate = mockClient.chat.completions.create;
  });

  describe('complete()', () => {
    it('should return a properly formatted CompletionResponse on success', async () => {
      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'Hello' },
        ],
        maxTokens: 100,
        temperature: 0.7,
      };

      const mockResponse = {
        id: 'chat-12345',
        model: 'gpt-4o',
        choices: [
          {
            message: { role: 'assistant', content: 'Hi there!' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);
      adapter = new OpenAIAdapter('test-key');

      const response = await adapter.complete(request);

      expect(response).toMatchObject({
        id: 'chat-12345',
        content: 'Hi there!',
        model: 'gpt-4o',
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        finishReason: 'stop',
      });
      expect(response.latencyMs).toBeGreaterThanOrEqual(0);
      expect(response.latencyMs).toBeLessThan(1000);
    });

    it('should retry on 429 (rate limit) with exponential backoff', async () => {
      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test' }],
      };

      const rateLimitError = new Error('Rate limit exceeded') as any;
      rateLimitError.status = 429;
      rateLimitError.headers = { 'retry-after': '1' };

      const successResponse = {
        id: 'chat-success',
        model: 'gpt-4o',
        choices: [{ message: { content: 'Success' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      };

      mockCreate.mockRejectedValueOnce(rateLimitError);
      mockCreate.mockResolvedValueOnce(successResponse);

      adapter = new OpenAIAdapter('test-key');

      const response = await adapter.complete(request);

      expect(response.content).toBe('Success');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 (server error) with exponential backoff', async () => {
      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test' }],
      };

      const serverError = new Error('Internal server error') as any;
      serverError.status = 500;

      const successResponse = {
        id: 'chat-success',
        model: 'gpt-4o',
        choices: [{ message: { content: 'Success' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      };

      mockCreate.mockRejectedValueOnce(serverError);
      mockCreate.mockResolvedValueOnce(successResponse);

      adapter = new OpenAIAdapter('test-key');

      const response = await adapter.complete(request);

      expect(response.content).toBe('Success');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on 401 (auth error)', async () => {
      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test' }],
      };

      const authError = new Error('Unauthorized') as any;
      authError.status = 401;

      mockCreate.mockRejectedValue(authError);

      adapter = new OpenAIAdapter('test-key');

      await expect(adapter.complete(request)).rejects.toThrow('authentication failed');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should support JSON response format', async () => {
      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'return JSON' }],
        responseFormat: 'json',
      };

      const mockResponse = {
        id: 'chat-json',
        model: 'gpt-4o',
        choices: [
          {
            message: { role: 'assistant', content: '{"key": "value"}' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
      };

      mockCreate.mockResolvedValue(mockResponse);
      adapter = new OpenAIAdapter('test-key');

      const response = await adapter.complete(request);

      expect(response.content).toBe('{"key": "value"}');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: 'json_object' },
        })
      );
    });

    it('should handle missing usage data gracefully', async () => {
      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test' }],
      };

      const mockResponse = {
        id: 'chat-incomplete',
        model: 'gpt-4o',
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        // No usage field
      };

      mockCreate.mockResolvedValue(mockResponse);
      adapter = new OpenAIAdapter('test-key');

      const response = await adapter.complete(request);

      expect(response.promptTokens).toBe(0);
      expect(response.completionTokens).toBe(0);
      expect(response.totalTokens).toBe(0);
    });
  });

  describe('isAvailable()', () => {
    it('should return true when API is accessible', async () => {
      const mockResponse = {
        id: 'ping-response',
        model: 'gpt-3.5-turbo',
        choices: [{ message: { content: 'pong' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      };

      mockCreate.mockResolvedValue(mockResponse);
      adapter = new OpenAIAdapter('test-key');

      const available = await adapter.isAvailable();

      expect(available).toBe(true);
    });

    it('should return false when API is not accessible', async () => {
      mockCreate.mockRejectedValue(new Error('Network error'));
      adapter = new OpenAIAdapter('test-key');

      const available = await adapter.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('adapter metadata', () => {
    it('should have correct name and provider properties', () => {
      adapter = new OpenAIAdapter('test-key');

      expect(adapter.name).toBe('openai');
      expect(adapter.provider).toBe('openai');
    });
  });

  describe('error handling', () => {
    it('should wrap 404 (model not found) error', async () => {
      const request: CompletionRequest = {
        model: 'nonexistent-model',
        messages: [{ role: 'user', content: 'test' }],
      };

      const notFoundError = new Error('Model not found') as any;
      notFoundError.status = 404;

      mockCreate.mockRejectedValue(notFoundError);
      adapter = new OpenAIAdapter('test-key');

      await expect(adapter.complete(request)).rejects.toThrow('model not found');
    });

    it('should wrap 400 (bad request) error with context', async () => {
      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test' }],
      };

      const badRequestError = new Error('Invalid request') as any;
      badRequestError.status = 400;

      mockCreate.mockRejectedValue(badRequestError);
      adapter = new OpenAIAdapter('test-key');

      await expect(adapter.complete(request)).rejects.toThrow('bad request');
    });

    it('should give up after MAX_RETRIES attempts', async () => {
      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test' }],
      };

      const serverError = new Error('Server error') as any;
      serverError.status = 500;

      mockCreate.mockRejectedValue(serverError);
      adapter = new OpenAIAdapter('test-key');

      await expect(adapter.complete(request)).rejects.toThrow();
      // MAX_RETRIES = 3, so 1 initial + 3 retries = 4 attempts
      expect(mockCreate).toHaveBeenCalledTimes(4);
    });
  });
});