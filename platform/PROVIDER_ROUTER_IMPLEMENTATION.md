# AI Provider Adapters & Model Routing Engine

## Implementation Complete

Created 8 files across 2 modules implementing a production-ready multi-provider LLM system for Samar-Minime.

### File Structure

```
platform/
├── providers/src/
│   ├── types.ts                    (31 lines)
│   ├── index.ts                    (4 lines)
│   ├── openai/adapter.ts           (48 lines)
│   ├── llama/adapter.ts            (50 lines)
│   └── claude/adapter.ts           (82 lines)
└── routing/src/
    ├── model-registry.ts           (104 lines)
    ├── router.ts                   (105 lines)
    └── index.ts                    (2 lines)

Total: 426 lines of TypeScript
```

## Module 1: Providers (`platform/providers/src/`)

### Core Abstractions (`types.ts`)
- `ChatMessage` - unified message interface
- `CompletionRequest` - standardized request format with model, messages, tokens, temperature, format, stops
- `CompletionResponse` - unified response with id, content, model, token counts, latency metrics
- `ProviderAdapter` - interface that all adapters implement

### OpenAI Adapter (`openai/adapter.ts`)
- Uses official `openai` npm package
- Supports all OpenAI models (GPT-3.5, GPT-4o, o1)
- JSON response formatting support
- Model availability checking via models.list()
- Latency tracking built-in

### Claude Adapter (`claude/adapter.ts`)
- Direct HTTP implementation (no SDK dependency)
- System message separation from user messages
- JSON response parsing from content array
- Anthropic API v2023-06-01 compatible
- Supports all Claude models (Sonnet, Opus)

### Llama Adapter (`llama/adapter.ts`)
- OpenAI-compatible API client
- Works with any Llama-based inference server
- Configurable baseUrl for any OpenAI-compatible provider
- Token counting via `js-tiktoken` library

## Module 2: Routing (`platform/routing/src/`)

### Model Registry (`model-registry.ts`)
- Centralized catalog of 18+ available models across 3 providers
- Models grouped by tier: `foundation` (fastest, cheapest), `standard` (balanced), `advanced` (most capable)
- Metadata tracked per model: basePrice, inputCostPer1M, outputCostPer1M, contextWindow, supportedFormats
- Registry methods:
  - `register()` - add/update models
  - `getModel()` - fetch single model config
  - `getModelsByProvider()` - filter by provider
  - `getModelsByTier()` - filter by capability tier
  - `list()` - all models

### Router (`router.ts`)
- Intelligent model selection engine
- Selection strategy: based on cost, capability, context window, latency targets
- Methods:
  - `selectModel()` - pick best model for a request
  - `estimateCost()` - predict token usage + pricing before execution
  - `canHandle()` - check if model supports request constraints (context, format)
  - `getAlternatives()` - suggest fallback models if primary fails
- Constraints-based selection: respects maxCost, maxLatency, requiredFormat, minContextWindow

## Integration Points

1. **With Config System** (`platform/config`)
   - Reads provider API keys from environment
   - Model registry populated from config on startup

2. **With Schemas** (`platform/schemas`)
   - Zod schemas for CompletionRequest/Response validation
   - Enum ModelSpec used in RoutingRequest/RoutingDecision

3. **With Observability** (`platform/observability`)
   - Cost tracking integrated into router
   - Token usage logged to metrics system
   - Latency recorded per request

4. **With Agent Runtime** (`platform/agent-core`)
   - Agents use router to select models for tasks
   - Provider adapters instantiated based on selected model
