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
- Configurable baseURL for flexibility
- Fallback ID generation when provider doesn't return ID
- Same interface as OpenAI adapter

## Module 2: Routing (`platform/routing/src/`)

### Model Registry (`model-registry.ts`)
8 production models organized in 4 tiers:

**UTILITY Tier** (cheapest, general tasks):
- gpt-3.5-turbo: $0.0000005/$0.0000015 per token
- llama-3.1-8b: Free (self-hosted)

**BUILDER Tier** (code, analysis, structured output):
- gpt-4o-mini: $0.00000015/$0.0000006 per token
- llama-3.1-70b: Free

**DIRECTOR Tier** (strategy, architecture, complex reasoning):
- gpt-4o: $0.0000025/$0.00001 per token
- claude-sonnet: $0.000003/$0.000015 per token

**SPECIALIST Tier** (deep analysis, edge cases):
- claude-opus: $0.000015/$0.000075 per token
- o1: $0.000015/$0.00006 per token

All models support JSON output. Vision models: GPT-4o, claude-sonnet, claude-opus, o1.

### Routing Engine (`router.ts`)

**ModelRouter class** implements intelligent model selection:

1. **Tier-based Selection**
   - Start with requested tier (UTILITY by default)
   - Escalate on retry (each retry bumps to next tier)
   - Automatic fallback to SPECIALIST if needed

2. **Cost Optimization**
   - Sort candidates by cost within same tier
   - Budget constraints respected
   - Fallback to cheaper model if budget exceeded

3. **Capability Matching**
   - JSON output requirement filtering
   - Vision capability requirement filtering
   - Provider preference (fallback if no matches)

4. **Smart Escalation**
   - Retries automatically bump tier for better results
   - Tracks escalation reason in response
   - Prevents re-routing to same tier after retry

5. **Public Methods**
   - `route(request)` - returns RoutingDecision with model selection
   - `getModelsForTier(tier)` - introspection support
   - `getModelById(id)` - direct model lookup

## Design Patterns

### Adapter Pattern
Each provider (OpenAI, Claude, Llama) implements the same ProviderAdapter interface, enabling:
- Transparent provider switching
- Pluggable new providers
- Consistent error handling
- Unified response format

### Strategy Pattern
ModelRouter uses different selection strategies based on:
- Requirements (JSON, vision)
- Budget constraints
- Tier escalation
- Provider preferences

### Registry Pattern
MODEL_REGISTRY is a static model catalog enabling:
- Cost visibility
- Capability queries
- Easy model enabling/disabling
- Multi-version support

## Integration Points

### Required External Types (from @samar/schemas)
```typescript
ModelSpec = {
  id, provider, name, tier, costPerInputToken, costPerOutputToken,
  maxTokens, supportsJson, supportsVision, enabled
}

RoutingRequest = {
  requiredTier?, retryCount, requiresJson?, requiresVision?,
  preferredProvider?, maxCostUsd?
}

RoutingDecision = {
  model: ModelSpec, reason: string, estimatedCostUsd: number,
  escalated: boolean, escalationReason?: string
}
```

### Environment Requirements
- OpenAI: OPENAI_API_KEY
- Claude: ANTHROPIC_API_KEY
- Llama: Accessible inference server at configured baseURL

## Next Steps

1. **Implement Provider Factory**
   - Instantiate adapters from environment variables
   - Cache adapter instances
   - Health check endpoints

2. **Add to Application**
   - Integrate ModelRouter into agent framework
   - Wire requests through router before calling adapters
   - Log routing decisions for analytics

3. **Extend Model Registry**
   - Add Claude 3 models when available
   - Add new open-source models as needed
   - Track performance metrics per model

4. **Observability**
   - Log model selections and reasons
   - Track cost per agent/project
   - Monitor adapter health and latency
   - Alert on budget thresholds

## Files Created

1. `C:\Users\Admin\Samar-Minime Systems/samar-minime-systems/platform/providers/src/types.ts`
2. `C:\Users\Admin\Samar-Minime Systems/samar-minime-systems/platform/providers/src/index.ts`
3. `C:\Users\Admin\Samar-Minime Systems/samar-minime-systems/platform/providers/src/openai/adapter.ts`
4. `C:\Users\Admin\Samar-Minime Systems/samar-minime-systems/platform/llama/adapter.ts`
5. `C:\Users\Admin\Samar-Minime Systems/samar-minime-systems/platform/providers/src/claude/adapter.ts`
6. `C:\Users\Admin\Samar-Minime Systems/samar-minime-systems/platform/routing/src/model-registry.ts`
7. `C:\Users\Admin\Samar-Minime Systems/samar-minime-systems/platform/routing/src/router.ts`
8. `C:\Users\Admin\Samar-Minime Systems/samar-minime-systems/platform/routing/src/index.ts`
