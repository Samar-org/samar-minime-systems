# Llama Model Selection Guide

## Available Models

### Llama 3.1 8B Instruct (Utility Tier)
- **Parameters:** 8B
- **VRAM Required:** ~16 GB (FP16), ~8 GB (INT8/AWQ)
- **Context Window:** 8,192 tokens (expandable to 128K with RoPE)
- **Speed:** ~80-120 tokens/sec on A100, ~40-60 tok/s on A10G
- **Best For:** Data extraction, formatting, tagging, classification, simple Q&A
- **Cost:** $0/token (self-hosted)
- **Equivalent Quality:** Between GPT-3.5-Turbo and GPT-4o-Mini

### Llama 3.1 70B Instruct (Builder Tier)
- **Parameters:** 70B
- **VRAM Required:** ~140 GB FP16 (needs 2x A100 80GB), ~40 GB AWQ quantized (1x A100 80GB or 4x A10G)
- **Context Window:** 8,192 tokens (expandable to 128K)
- **Speed:** ~20-40 tokens/sec on 4x A100, ~10-15 tok/s quantized single GPU
- **Best For:** Content writing, code generation, research synthesis, complex reasoning
- **Cost:** $0/token (self-hosted)
- **Equivalent Quality:** Comparable to GPT-4o-Mini, approaching GPT-4o on many tasks

### Llama 3.1 405B Instruct (Director Tier — Future)
- **Parameters:** 405B
- **VRAM Required:** ~810 GB FP16 (8x A100 80GB), ~200 GB quantized
- **Not recommended for self-hosting** unless you have 8+ A100 80GB GPUs
- **Better served via:** Together AI, Fireworks AI, or Groq API ($0.50-2.00/M tokens)

## Quantization Options

| Method | Quality Loss | VRAM Savings | Speed Impact | Recommended For |
|--------|-------------|--------------|--------------|----------|
| FP16 (none) | None | Baseline | Baseline | Best quality, if VRAM allows |
| AWQ | Minimal (<1%) | ~50% | +10-20% faster | **Recommended default** |
| GPTQ | Low (~1-2%) | ~50% | Similar | Good alternative to AWQ |
| INT8 | Low (~2%) | ~50% | -10% slower | When AWQ not available |
| INT4 | Moderate (~5%) | ~75% | Varies | Budget setups only |

## When to Use Each Model

```
Task Complexity    Low ◄──────────────────────► High
                   │                              │
Llama 3.1 8B      ████████████░░░░░░░░░░░░░░░░░
Llama 3.1 70B     ░░░░░░████████████████░░░░░░░
GPT-4o-Mini       ░░░░░░░░████████████████░░░░░  (API fallback)
GPT-4o            ░░░░░░░░░░░░░░████████████░░░  (escalation)
Claude Opus       ░░░░░░░░░░░░░░░░░░░░████████  (specialist)
```

### Route to Llama 8B:
- Extracting structured data from text
- Formatting and reformatting content
- Tagging, categorization, labeling
- Simple summarization
- Content variation generation
- Template filling

### Route to Llama 70B:
- Long-form content writing
- Code generation and review
- Research report drafting
- SEO content creation
- Ad copy generation
- Complex Q&A and reasoning

### Fallback to OpenAI/Anthropic When:
- Vision/image understanding required (Llama has no vision)
- 128K+ context needed reliably
- Highest accuracy critical (specialist tasks)
- Fleet is down or overloaded