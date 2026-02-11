import { z } from 'zod';

export const WebFetchArgsSchema = z.object({
  url: z.string().url().describe('The URL to fetch'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET').describe('HTTP method'),
  headers: z.record(z.string()).optional().describe('HTTP headers'),
  body: z.string().optional().describe('Request body for POST/PUT'),
});

/**
 * Fetch content from a URL
 */
export async function webFetch(args: z.infer<typeof WebFetchArgsSchema>): Promise<string> {
  const { url, method = 'GET', headers = {}, body } = args;

  const response = await fetch(url, {
    method,
    headers: {
      'User-Agent': 'PromptTrap/0.1.0',
      ...headers,
    },
    body: body && (method === 'POST' || method === 'PUT') ? body : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';

  // Handle different content types
  if (contentType.includes('application/json')) {
    const json = await response.json();
    return JSON.stringify(json, null, 2);
  } else if (contentType.includes('text/')) {
    return await response.text();
  } else {
    // For binary content, return metadata
    const size = response.headers.get('content-length');
    return `Binary content (${contentType}), size: ${size || 'unknown'} bytes`;
  }
}
