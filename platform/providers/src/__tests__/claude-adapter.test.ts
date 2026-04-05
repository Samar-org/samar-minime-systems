import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ClaudeAdapter } from '../claude/adapter.js';
import type { CompletionRequest, CompletionResponse } from '../types.js';

// Mock global fetch
global.fetch = vi.fn();

describe('ClaudeAdapter', () => {
  let adapter: ClaudeAdapter;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = global.fetch as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('complete()', () => {
    it('should return properly formatted CompletionResponse on success', async () => {
      const request: CompletionRequest = {
        model: 'claude-sonnet-4-20250514',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, Claude!' },
        ],
        maxTokens: 100,
      };

      const mockResponse = {
        id: 'msg-12345',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello! How can I help?' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 20, output_tokens: 10 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
        headers: new Map(),
      } as any);

      adapter = new ClaudeAdapter('test-api-key');
      const response = await adapter.complete(request);

      expect(response).toMatchObject({
        id: 'msg-12345',
        content: 'Hello! How can I help?',
        model: 'claude-sonnet-4-20250514',
        promptTokens: 20,
        completionTokens: 10,
        totalTokens: 30,
        finishReason: 'end_turn',
      });
      expect(response.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should extract system message from messages array', async () => {
      const request: CompletionRequest = {
        model: 'claude-sonnet-4-20250514',
        messages: [
          { role: 'system', content: 'System instructions here' },
          { role: 'user', content: 'User message' },
        ],
      };

      const mockResponse = {
        id: 'msg-system-test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      let capturedBody: any = null;
      mockFetch.mockImplementation((url: string, options: any) => {
        capturedBody = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
          headers: new Map(),
        });
      });

      adapter = new ClaudeAdapter('test-api-key');
      await adapter.complete(request);

      expect(capturedBody.system).toBe('System instructions here');
      expect(capturedBody.messages).toEqual([{ role: 'user', content: 'User message' }]);
    });

    it('should merge consecutive messages of the same role', async () => {
      const request: CompletionRequest = {
        model: 'claude-sonnet-4-20250514',
        messages: [
          { role: 'user', content: 'First message' },
          { role: 'user', content: 'Second message' }, // Same role
          { role: 'assistant', content: 'Response' },
        ],
      };

      const mockResponse = {
        id: 'msg-merge-test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 20, output_tokens: 5 },
      };

      let capturedBody: any = null;
      mockFetch.mockImplementation((url: string, options: any) => {
        capturedBody = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
          headers: new Map(),
        });
      });

      adapter = new ClaudeAdapter('test-api-key');
      await adapter.complete(request);

      // Should merge first two user messages
      expect(capturedBody.messages[0].content).toContain('First message');
      expect(capturedBody.messages[0].content).toContain('Second message');
      expect(capturedBody.messages[1].role).toBe('assistant');
    });

    it('should retry on 429 (rate limit)', async () => {
      const request: CompletionRequest = {
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'test' }],
      };

      const mockResponse = {
        id: 'msg-success',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Success' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 5, output_tokens: 3 },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Map([['retry-after', '1']]),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockResponse),
          headers: new Map(),
        } as any);

      adapter = new ClaudeAdapter('test-api-key');
      const response = await adapter.complete(request);

      expect(response.content).toBe('Success');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle 500 server error with retry', async () => {
      const request: CompletionRequest = {
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'test' }],
      };

      const mockResponse = {
        id: 'msg-success',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Success' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 5, output_tokens: 3 },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Map(),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockResponse),
          headers: new Map(),
        } as any);

      adapter = new ClaudeAdapter('test-api-key');
      const response = await adapter.complete(request);

      expect(response.content).toBe('Success');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle timeout by aborting the request', async () => {
      const request: CompletionRequest = {
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'test' }],
      };

      mockFetch.mockImplementation(() => {
        return new Promise(() => {}); // Never resolves, will timeout
      });

      adapter = new ClaudeAdapter('test-api-key', { timeout: 100 });

      // Use fake timers to simulate timeout
      vi.useFakeTimers();
      const promise = adapter.complete(request);

      vi.runAllTimersAsync();

      vi.useRealTimers();

      // The fetch should have been called with an AbortSignal
      expect(mockFetch).toHaveBeenCalled();
      const options = (mockFetch.mock.calls[0] as any[])[1];
      expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it('should NOT retry on 401 (auth error)', async () => {
      const request: CompletionRequest = {
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'test' }],
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValue({ error: { message: 'Invalid API key' } }),
        headers: new Map(),
      } as any);

      adapter = new ClaudeAdapter('bad-api-key');

      await expect(adapter.complete(request)).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('message normalization', () => {
    it('should add initial user message if sequence starts with assistant', async () => {
      const request: CompletionRequest = {
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'assistant', content: 'Unexpected start' }],
      };

      const mockResponse = {
        id: 'msg-normalize',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      let capturedBody: any = null;
      mockFetch.mockImplementation((url: string, options: any) => {
        capturedBody = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
          headers: new Map(),
        });
      });

      adapter = new ClaudeAdapter('test-api-key');
      await adapter.complete(request);

      expect(capturedBody.messages[0].role).toBe('user');
      expect(capturedBody.messages[0].content).toBe('Continue.');
    });
  });

  describe('isAvailable()', () => {
    it('should return true when API is accessible', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'msg-ping' }),
        headers: new Map(),
      } as any);

      adapter = new ClaudeAdapter('test-api-key');
      const available = await adapter.isAvailable();

      expect(available).toBe(true);
    });

    it('should return false when API is not accessible', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      adapter = new ClaudeAdapter('test-api-key');
      const available = await adapter.isAvailable();

      expect(available).toBe(false);
    });

    it('should return false on 4xx/5xx errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      } as any);

      adapter = new ClaudeAdapter('test-api-key');
      const available = await adapter.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('adapter metadata', () => {
    it('should have correct name and provider properties', () => {
      adapter = new ClaudeAdapter('test-api-key');

      expect(adapter.name).toBe('claude');
      expect(adapter.provider).toBe('anthropic');
    });
  });

  describe('API headers and authentication', () => {
    it('should include required Anthropic API headers', async () => {
      const request: CompletionRequest = {
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'test' }],
      };

      const mockResponse = {
        id: 'msg-headers',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 5, output_tokens: 3 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
        headers: new Map(),
      } as any);

      adapter = new ClaudeAdapter('secret-api-key');
      await adapter.complete(request);

      const callArgs = mockFetch.mock.calls[0] as any[];
      const url = callArgs[0] as string;
      const options = callArgs[1] as Record<string, any>;

      expect(url).toContain('api.anthropic.com/v1/messages');
      expect(options.headers['x-api-key']).toBe('secret-api-key');
      expect(options.headers['anthropic-version']).toBe('2023-06-01');
      expect(options.headers['Content-Type']).toBe('application/json');
    });

    it('should use custom baseUrl if provided', async () => {
      const request: CompletionRequest = {
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'test' }],
      };

      const mockResponse = {
        id: 'msg-custom-url',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 5, output_tokens: 3 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
        headers: new Map(),
      } as any);

      adapter = new ClaudeAdapter('test-api-key', { baseUrl: 'https://custom.endpoint.com/v1' });
      await adapter.complete(request);

      const callArgs = mockFetch.mock.calls[0] as any[];
      const url = callArgs[0] as string;

      expect(url).toContain('custom.endpoint.com/v1/messages');
    });
  });
});