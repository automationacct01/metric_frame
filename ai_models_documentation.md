# Core AI Model Reference Documentation

**Last Updated:** January 24, 2026  
**Purpose:** Authoritative reference for Claude Code to identify currently available AI models  
**Sources:** Official vendor documentation only

---

## Important Notes for Claude Code

- **Always verify model availability** before using any model ID in code
- **Model IDs are case-sensitive** and must match exactly as documented
- When in doubt, use the provider's API to list available models programmatically

---

## 1. Anthropic (Claude)

**Official Documentation:** https://docs.anthropic.com/en/docs/about-claude/models/overview

### Claude 4.5 Family (Current)

| Model | API ID | Context Window | Max Output | Description |
|-------|--------|----------------|------------|-------------|
| **Claude Opus 4.5** | `claude-opus-4-5-20251101` | 200K tokens | 64K tokens | Premium intelligence model |
| **Claude Sonnet 4.5** | `claude-sonnet-4-5-20250929` | 200K / 1M (beta) | 64K tokens | Best balance of intelligence & speed |
| **Claude Haiku 4.5** | `claude-haiku-4-5-20251001` | 200K tokens | 64K tokens | Fastest model, near-frontier intelligence |

### Model Aliases (Auto-Update to Latest Snapshots)
```
claude-opus-4-5        → claude-opus-4-5-20251101
claude-sonnet-4-5      → claude-sonnet-4-5-20250929
claude-haiku-4-5       → claude-haiku-4-5-20251001
```

**Production Note:** Use specific snapshot versions (with dates) in production for consistent behavior.

---

## 2. OpenAI

**Official Documentation:** https://platform.openai.com/docs/models/

### GPT-5 Family (Current)

| Model | API ID | Context Window | Max Output | Description |
|-------|--------|----------------|------------|-------------|
| **GPT-5.2** | `gpt-5.2-2025-12-11` | 400K | 128K | Best for coding & agentic tasks |
| **GPT-5.2 Codex** | `gpt-5.2-codex-2026-01-14` | 400K | 128K | Optimized for Codex CLI |
| **GPT-5.1** | `gpt-5.1-2025-11-13` | 400K | 128K | Reasoning model |
| **GPT-5** | `gpt-5-2025-08-07` | 400K | 128K | Flagship reasoning model |
| **GPT-5 Mini** | `gpt-5-mini-2025-08-07` | 400K | 128K | Faster GPT-5 variant |
| **GPT-5 Pro** | `gpt-5-pro-2025-10-06` | 400K | 128K | Extended reasoning |

---

## 3. AWS Bedrock

**Official Documentation:** https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html

### Anthropic Claude on Bedrock

| Model | Model ID |
|-------|----------|
| Claude Opus 4.5 | `anthropic.claude-opus-4-5-20251101-v1:0` |
| Claude Sonnet 4.5 | `anthropic.claude-sonnet-4-5-20250929-v1:0` |
| Claude Haiku 4.5 | `anthropic.claude-haiku-4-5-20251001-v1:0` |

### Amazon Nova Family

| Model | Model ID | Input Types |
|-------|----------|-------------|
| Nova Premier | `amazon.nova-premier-v1:0` | Text, Image, Video |
| Nova Pro | `amazon.nova-pro-v1:0` | Text, Image, Video |
| Nova Lite | `amazon.nova-lite-v1:0` | Text, Image, Video |
| Nova Micro | `amazon.nova-micro-v1:0` | Text |

### Meta Llama 4 on Bedrock

| Model | Model ID |
|-------|----------|
| Llama 4 Maverick 17B | `meta.llama4-maverick-17b-instruct-v1:0` |
| Llama 4 Scout 17B | `meta.llama4-scout-17b-instruct-v1:0` |

### Other Core Models on Bedrock

| Provider | Model | Model ID |
|----------|-------|----------|
| Mistral | Mistral Large 3 | `mistral.mistral-large-3-675b-instruct` |
| DeepSeek | DeepSeek-R1 | `deepseek.r1-v1:0` |
| Qwen | Qwen3 235B | `qwen.qwen3-235b-a22b-2507-v1:0` |

---

## 4. Google Cloud Vertex AI

**Official Documentation:** https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models

### Gemini Family

| Model | Model ID | Description |
|-------|----------|-------------|
| **Gemini 3 Pro** (Preview) | `gemini-3-pro` | Latest reasoning model, 1M context |
| **Gemini 3 Flash** (Preview) | `gemini-3-flash` | Best multimodal + coding |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | Complex reasoning, 1M context |
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | Fast, controllable thinking |

### Claude on Vertex AI

| Model | Model ID |
|-------|----------|
| Claude Opus 4.5 | `claude-opus-4-5@20251101` |
| Claude Sonnet 4.5 | `claude-sonnet-4-5@20250929` |
| Claude Haiku 4.5 | `claude-haiku-4-5@20251001` |

### Partner Models on Vertex (MaaS)

| Provider | Model | Model ID |
|----------|-------|----------|
| Meta | Llama 4 Maverick | `llama4-maverick` |
| Meta | Llama 4 Scout | `llama4-scout` |
| Mistral | Mistral Medium 3 | `mistral-medium-3` |
| DeepSeek | DeepSeek-R1 | `deepseek-r1-0528` |

---

## 5. Together AI

**Official Documentation:** https://docs.together.ai/docs/serverless-models

### Core Chat Models

| Model | Model ID | Context Length |
|-------|----------|----------------|
| **DeepSeek-V3.1** | `deepseek-ai/DeepSeek-V3.1` | 128K |
| **DeepSeek-R1** | `deepseek-ai/DeepSeek-R1` | 163K |
| **Qwen3-Coder 480B** | `Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8` | 256K |
| **Qwen3 235B Thinking** | `Qwen/Qwen3-235B-A22B-Thinking-2507` | 262K |
| **Llama 4 Maverick** | `meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | 1M |
| **Llama 4 Scout** | `meta-llama/Llama-4-Scout-17B-16E-Instruct` | 1M |
| **Llama 3.3 70B Turbo** | `meta-llama/Llama-3.3-70B-Instruct-Turbo` | 131K |
| **Mistral Small 3** | `mistralai/Mistral-Small-24B-Instruct-2501` | 32K |

### Core Image Generation

| Model | Model ID |
|-------|----------|
| FLUX.2 Pro | `black-forest-labs/FLUX.2-pro` |
| FLUX.1.1 Pro | `black-forest-labs/FLUX.1.1-pro` |
| FLUX.1 Schnell | `black-forest-labs/FLUX.1-schnell` |

---

## 6. Azure OpenAI (Azure AI Foundry)

**Official Documentation:** https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models

### GPT-5 Family on Azure

| Model | Model ID | Context Window | Max Output |
|-------|----------|----------------|------------|
| GPT-5.2 | `gpt-5.2` (2025-12-11) | 400K | 128K |
| GPT-5.2 Codex | `gpt-5.2-codex` (2026-01-14) | 400K | 128K |
| GPT-5.1 | `gpt-5.1` (2025-11-13) | 400K | 128K |
| GPT-5 | `gpt-5` (2025-08-07) | 400K | 128K |
| GPT-5 Mini | `gpt-5-mini` (2025-08-07) | 400K | 128K |
| GPT-5 Pro | `gpt-5-pro` (2025-10-06) | 400K | 128K |

### Third-Party Core Models on Azure

| Provider | Model | Model ID |
|----------|-------|----------|
| DeepSeek | DeepSeek-R1 | `DeepSeek-R1` |
| Meta | Llama 4 Maverick | `Llama-4-Maverick-17B-128E-Instruct-FP8` |
| Mistral | Mistral Large 3 | `Mistral-Large-3` |

---

## Quick Reference: Recommended Models by Use Case

| Use Case | Anthropic | OpenAI | GCP | AWS | Together |
|----------|-----------|--------|-----|-----|----------|
| **General Purpose** | claude-sonnet-4-5 | gpt-5 | gemini-2.5-pro | nova-pro | Llama-3.3-70B-Turbo |
| **Coding** | claude-sonnet-4-5 | gpt-5.2-codex | gemini-3-flash | claude-sonnet-4-5 | Qwen3-Coder-480B |
| **Fast/Low Latency** | claude-haiku-4-5 | gpt-5-mini | gemini-2.5-flash | nova-lite | Llama-4-Scout |
| **Complex Reasoning** | claude-opus-4-5 | gpt-5-pro | gemini-3-pro | claude-opus-4-5 | DeepSeek-R1 |

---

## Programmatic Model Discovery

### Anthropic
```python
import anthropic
client = anthropic.Anthropic()
models = client.models.list()
for model in models.data:
    print(model.id)
```

### OpenAI
```python
from openai import OpenAI
client = OpenAI()
models = client.models.list()
for model in models.data:
    print(model.id)
```

### AWS Bedrock
```python
import boto3
bedrock = boto3.client('bedrock')
response = bedrock.list_foundation_models()
for model in response['modelSummaries']:
    print(model['modelId'])
```

### Together AI
```python
from together import Together
client = Together()
models = client.models.list()
for model in models:
    print(model.id)
```

---

*This document is maintained for Claude Code reference. Always verify against official documentation for production use.*
