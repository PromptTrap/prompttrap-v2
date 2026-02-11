/**
 * AI service domain registry for browser extension
 */

export interface AIService {
  name: string;
  domains: string[];
  inputSelectors: string[];  // CSS selectors for input fields
  description: string;
}

export const AI_SERVICES: AIService[] = [
  {
    name: 'ChatGPT',
    domains: ['chatgpt.com', 'chat.openai.com'],
    inputSelectors: [
      '#prompt-textarea',
      'textarea[placeholder*="Message"]',
      'div[contenteditable="true"][role="textbox"]',
    ],
    description: 'OpenAI ChatGPT',
  },
  {
    name: 'Claude',
    domains: ['claude.ai'],
    inputSelectors: [
      'div[contenteditable="true"][data-placeholder]',
      'div[contenteditable="true"].ProseMirror',
      'textarea[placeholder*="talk"]',
    ],
    description: 'Anthropic Claude',
  },
  {
    name: 'Gemini',
    domains: ['gemini.google.com'],
    inputSelectors: [
      'div[contenteditable="true"][aria-label*="Send"]',
      'rich-textarea',
      'textarea[aria-label*="chat"]',
    ],
    description: 'Google Gemini',
  },
  {
    name: 'Perplexity',
    domains: ['perplexity.ai', 'www.perplexity.ai'],
    inputSelectors: [
      'textarea[placeholder*="Ask"]',
      'div[contenteditable="true"]',
    ],
    description: 'Perplexity AI',
  },
  {
    name: 'DeepSeek',
    domains: ['chat.deepseek.com', 'deepseek.com'],
    inputSelectors: [
      'textarea[placeholder*="Message"]',
      'div[contenteditable="true"]',
    ],
    description: 'DeepSeek',
  },
  {
    name: 'Copilot',
    domains: ['copilot.microsoft.com', 'www.bing.com/chat'],
    inputSelectors: [
      'textarea[placeholder*="Ask"]',
      'div[contenteditable="true"]',
    ],
    description: 'Microsoft Copilot',
  },
  {
    name: 'Poe',
    domains: ['poe.com'],
    inputSelectors: [
      'textarea[class*="ChatMessageInput"]',
      'textarea[placeholder*="Talk"]',
    ],
    description: 'Poe (Quora)',
  },
  {
    name: 'HuggingChat',
    domains: ['huggingface.co'],
    inputSelectors: [
      'textarea[placeholder*="Ask"]',
      'form textarea',
    ],
    description: 'HuggingFace Chat',
  },
  {
    name: 'You.com',
    domains: ['you.com'],
    inputSelectors: [
      'textarea[placeholder*="Ask"]',
      'div[contenteditable="true"]',
    ],
    description: 'You.com AI Search',
  },
  {
    name: 'Phind',
    domains: ['phind.com', 'www.phind.com'],
    inputSelectors: [
      'textarea[placeholder*="Ask"]',
      'div[contenteditable="true"]',
    ],
    description: 'Phind',
  },
];

export function detectAIService(hostname: string): AIService | null {
  for (const service of AI_SERVICES) {
    for (const domain of service.domains) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return service;
      }
    }
  }
  return null;
}
