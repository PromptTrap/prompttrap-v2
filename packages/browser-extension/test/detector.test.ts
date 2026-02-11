import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectAIService } from '@prompttrap/shared';

describe('AI Service Detection', () => {
  it('should detect ChatGPT', () => {
    const service = detectAIService('chatgpt.com');
    expect(service).not.toBeNull();
    expect(service?.name).toBe('ChatGPT');
  });

  it('should detect Claude', () => {
    const service = detectAIService('claude.ai');
    expect(service).not.toBeNull();
    expect(service?.name).toBe('Claude');
  });

  it('should detect Gemini', () => {
    const service = detectAIService('gemini.google.com');
    expect(service).not.toBeNull();
    expect(service?.name).toBe('Gemini');
  });

  it('should detect Perplexity', () => {
    const service = detectAIService('perplexity.ai');
    expect(service).not.toBeNull();
    expect(service?.name).toBe('Perplexity');
  });

  it('should detect DeepSeek', () => {
    const service = detectAIService('chat.deepseek.com');
    expect(service).not.toBeNull();
    expect(service?.name).toBe('DeepSeek');
  });

  it('should return null for non-AI domain', () => {
    const service = detectAIService('google.com');
    expect(service).toBeNull();
  });

  it('should detect subdomain variations', () => {
    const service = detectAIService('chat.openai.com');
    expect(service).not.toBeNull();
    expect(service?.name).toBe('ChatGPT');
  });
});
