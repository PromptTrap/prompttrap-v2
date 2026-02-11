/**
 * AI service detection and input field monitoring
 */

import { detectAIService, type AIService } from '@prompttrap/shared';

export class AIServiceDetector {
  private aiService: AIService | null = null;
  private inputElements: Set<Element> = new Set();
  private observer: MutationObserver | null = null;

  constructor() {
    this.detectService();
    this.startMonitoring();
  }

  private detectService(): void {
    const hostname = window.location.hostname;
    this.aiService = detectAIService(hostname);

    if (this.aiService) {
      console.log(`[PromptTrap] Detected AI service: ${this.aiService.name}`);
    }
  }

  getService(): AIService | null {
    return this.aiService;
  }

  private startMonitoring(): void {
    if (!this.aiService) return;

    // Find existing input elements
    this.findInputElements();

    // Watch for new input elements
    this.observer = new MutationObserver(() => {
      this.findInputElements();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private findInputElements(): void {
    if (!this.aiService) return;

    for (const selector of this.aiService.inputSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (!this.inputElements.has(el)) {
            this.inputElements.add(el);
            this.attachListeners(el);
          }
        });
      } catch (e) {
        // Invalid selector, skip
        console.warn(`[PromptTrap] Invalid selector: ${selector}`, e);
      }
    }
  }

  private attachListeners(element: Element): void {
    // Cast to HTMLElement for event listeners
    const el = element as HTMLElement;

    // Paste event - highest priority for DLP
    el.addEventListener('paste', (e) => {
      this.handlePaste(e as ClipboardEvent, el);
    });

    // Input event - text entry
    el.addEventListener('input', () => {
      this.handleInput(el);
    });

    // Keydown for Enter/Submit detection
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        this.handleSubmit(el);
      }
    });

    console.log(`[PromptTrap] Attached listeners to input element`, el);
  }

  private handlePaste(event: ClipboardEvent, element: HTMLElement): void {
    const clipboardData = event.clipboardData?.getData('text') || '';

    if (clipboardData) {
      // Dispatch custom event for DLP scanning
      const pasteEvent = new CustomEvent('prompttrap:paste', {
        detail: {
          text: clipboardData,
          element: element,
          timestamp: new Date().toISOString(),
        },
      });
      document.dispatchEvent(pasteEvent);
    }
  }

  private handleInput(element: HTMLElement): void {
    // Get current text from various input types
    const text = this.getElementText(element);

    if (text && text.length > 10) { // Only track meaningful input
      const inputEvent = new CustomEvent('prompttrap:input', {
        detail: {
          length: text.length,
          element: element,
          timestamp: new Date().toISOString(),
        },
      });
      document.dispatchEvent(inputEvent);
    }
  }

  private handleSubmit(element: HTMLElement): void {
    const text = this.getElementText(element);

    if (text) {
      const submitEvent = new CustomEvent('prompttrap:submit', {
        detail: {
          text: text,
          length: text.length,
          element: element,
          timestamp: new Date().toISOString(),
        },
      });
      document.dispatchEvent(submitEvent);
    }
  }

  private getElementText(element: HTMLElement): string {
    if (element instanceof HTMLTextAreaElement) {
      return element.value;
    } else if (element instanceof HTMLInputElement) {
      return element.value;
    } else if (element.isContentEditable) {
      return element.textContent || '';
    }
    return '';
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.inputElements.clear();
  }
}
