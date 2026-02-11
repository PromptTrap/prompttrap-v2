/**
 * Main content script - runs on AI service pages
 */

import { AIServiceDetector } from './detector.js';
import { ContentDLPScanner } from './dlp-scanner.js';
import { showToast } from './toast.js';
import type { BrowserEvent } from '@prompttrap/shared';

class PromptTrapContent {
  private detector: AIServiceDetector;
  private dlpScanner: ContentDLPScanner;
  private sessionId: string;
  private sessionStart: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.detector = new AIServiceDetector();
    this.dlpScanner = new ContentDLPScanner();

    this.initialize();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initialize(): void {
    const service = this.detector.getService();
    if (!service) {
      console.log('[PromptTrap] Not an AI service page');
      return;
    }

    console.log(`[PromptTrap] Initialized on ${service.name}`);

    // Log page visit
    this.logPageVisit();

    // Listen for input events
    this.attachEventListeners();

    // Show monitoring banner if enabled
    this.maybeShowBanner();
  }

  private attachEventListeners(): void {
    // Paste events
    document.addEventListener('prompttrap:paste', async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { text } = customEvent.detail;
      await this.handlePaste(text);
    });

    // Input events
    document.addEventListener('prompttrap:input', (e: Event) => {
      const customEvent = e as CustomEvent;
      const { length } = customEvent.detail;
      this.handleInput(length);
    });

    // Submit events
    document.addEventListener('prompttrap:submit', async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { text, length } = customEvent.detail;
      await this.handleSubmit(text, length);
    });
  }

  private async handlePaste(text: string): Promise<void> {
    const findings = this.dlpScanner.scan(text, 'paste');

    if (findings.length > 0) {
      console.warn('[PromptTrap] DLP findings on paste:', findings);

      const shouldWarn = await this.dlpScanner.shouldWarnUser(findings);
      const shouldBlock = await this.dlpScanner.shouldBlockUser(findings);

      if (shouldBlock) {
        showToast(`🚫 Blocked: Detected ${findings.length} sensitive pattern(s)`, 'error');
        // TODO: Actually prevent the paste (requires more invasive approach)
      } else if (shouldWarn) {
        const patterns = findings.map(f => f.pattern).join(', ');
        showToast(`⚠️ Warning: Detected ${patterns} in pasted content`, 'warning');
      }
    }

    // Log the event
    await this.sendEvent({
      timestamp: new Date().toISOString(),
      source: 'browser',
      event_type: 'paste',
      session_id: this.sessionId,
      domain: window.location.hostname,
      ai_service: this.detector.getService()?.name || 'unknown',
      action: 'paste',
      input_length: text.length,
      dlp_findings: findings,
      dlp_severity: this.getMaxSeverity(findings),
      dlp_action_taken: findings.length > 0 ? 'warned' : 'logged',
    });
  }

  private handleInput(length: number): void {
    // Throttled logging - don't log every keystroke
    // Just track that input is happening
  }

  private async handleSubmit(text: string, length: number): Promise<void> {
    const findings = this.dlpScanner.scan(text, 'submit');

    if (findings.length > 0) {
      console.warn('[PromptTrap] DLP findings on submit:', findings);
    }

    await this.sendEvent({
      timestamp: new Date().toISOString(),
      source: 'browser',
      event_type: 'text_input',
      session_id: this.sessionId,
      domain: window.location.hostname,
      ai_service: this.detector.getService()?.name || 'unknown',
      action: 'text_input',
      input_length: length,
      dlp_findings: findings,
      dlp_severity: this.getMaxSeverity(findings),
      dlp_action_taken: findings.length > 0 ? 'logged' : 'logged',
    });
  }

  private async logPageVisit(): Promise<void> {
    await this.sendEvent({
      timestamp: new Date().toISOString(),
      source: 'browser',
      event_type: 'ai_visit',
      session_id: this.sessionId,
      domain: window.location.hostname,
      ai_service: this.detector.getService()?.name || 'unknown',
      action: 'page_visit',
      duration_seconds: 0,
      dlp_findings: [],
      dlp_severity: 'none',
      dlp_action_taken: 'logged',
    });
  }

  private async sendEvent(event: BrowserEvent): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'browser_event',
        event,
      });
    } catch (e) {
      console.error('[PromptTrap] Failed to send event:', e);
    }
  }

  private getMaxSeverity(findings: any[]): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (findings.length === 0) return 'none';

    const severityOrder = ['none', 'low', 'medium', 'high', 'critical'];
    let maxSeverity = 'none';

    for (const finding of findings) {
      if (severityOrder.indexOf(finding.severity) > severityOrder.indexOf(maxSeverity)) {
        maxSeverity = finding.severity;
      }
    }

    return maxSeverity as any;
  }

  private async maybeShowBanner(): Promise<void> {
    const result = await chrome.storage.local.get(['showBanner']);
    if (result.showBanner === false) return;

    // Inject monitoring banner
    const banner = document.createElement('div');
    banner.id = 'prompttrap-banner';
    banner.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #1e293b;
        color: #e2e8f0;
        padding: 8px 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        z-index: 999999;
        border-bottom: 2px solid #3b82f6;
        display: flex;
        align-items: center;
        justify-content: space-between;
      ">
        <div>
          <span style="color: #3b82f6; margin-right: 8px;">🔒</span>
          <strong>PromptTrap:</strong> AI usage on this site is being monitored per company policy
        </div>
        <button id="prompttrap-banner-close" style="
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 18px;
          padding: 0;
        ">×</button>
      </div>
    `;

    document.body.prepend(banner);

    // Close button
    document.getElementById('prompttrap-banner-close')?.addEventListener('click', () => {
      banner.remove();
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PromptTrapContent();
  });
} else {
  new PromptTrapContent();
}
