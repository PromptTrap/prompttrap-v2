/**
 * Background service worker
 * - Receives events from content scripts
 * - Tracks sessions
 * - Communicates with native messaging host
 */

import type { BrowserEvent } from '@prompttrap/shared';

interface Session {
  sessionId: string;
  domain: string;
  aiService: string;
  startTime: number;
  eventCount: number;
  dlpFindings: number;
}

class PromptTrapBackground {
  private sessions: Map<string, Session> = new Map();
  private nativePort: chrome.runtime.Port | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender);
      sendResponse({ received: true });
      return true; // Keep channel open for async response
    });

    // Connect to native messaging host
    this.connectNativeHost();

    // Track extension icon clicks
    chrome.action.onClicked.addListener(() => {
      chrome.runtime.openOptionsPage();
    });

    console.log('[PromptTrap Background] Initialized');
  }

  private connectNativeHost(): void {
    try {
      this.nativePort = chrome.runtime.connectNative('com.prompttrap.host');

      this.nativePort.onMessage.addListener((message) => {
        console.log('[PromptTrap] Message from native host:', message);
      });

      this.nativePort.onDisconnect.addListener(() => {
        console.warn('[PromptTrap] Native host disconnected');
        this.nativePort = null;

        // Retry connection after delay
        setTimeout(() => this.connectNativeHost(), 5000);
      });

      console.log('[PromptTrap] Connected to native messaging host');
    } catch (e) {
      console.error('[PromptTrap] Failed to connect to native host:', e);
      // Gracefully degrade - store events locally
    }
  }

  private async handleMessage(message: any, sender: chrome.runtime.MessageSender): Promise<void> {
    if (message.type === 'browser_event') {
      await this.handleBrowserEvent(message.event, sender);
    }
  }

  private async handleBrowserEvent(event: BrowserEvent, sender: chrome.runtime.MessageSender): Promise<void> {
    // Track session
    this.trackSession(event);

    // Send to native host
    await this.sendToNativeHost(event);

    // Update badge with DLP count
    await this.updateBadge();

    // Store in local storage as backup
    await this.storeEventLocally(event);
  }

  private trackSession(event: BrowserEvent): void {
    const session = this.sessions.get(event.session_id);

    if (session) {
      session.eventCount++;
      session.dlpFindings += event.dlp_findings.length;
    } else {
      this.sessions.set(event.session_id, {
        sessionId: event.session_id,
        domain: event.domain,
        aiService: event.ai_service,
        startTime: Date.now(),
        eventCount: 1,
        dlpFindings: event.dlp_findings.length,
      });
    }
  }

  private async sendToNativeHost(event: BrowserEvent): Promise<void> {
    if (!this.nativePort) {
      console.warn('[PromptTrap] No native host connection, event stored locally');
      return;
    }

    try {
      this.nativePort.postMessage({
        type: 'audit_event',
        event,
      });
    } catch (e) {
      console.error('[PromptTrap] Failed to send to native host:', e);
    }
  }

  private async storeEventLocally(event: BrowserEvent): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['events']);
      const events = result.events || [];

      // Keep last 100 events
      events.push(event);
      if (events.length > 100) {
        events.shift();
      }

      await chrome.storage.local.set({ events });
    } catch (e) {
      console.error('[PromptTrap] Failed to store event locally:', e);
    }
  }

  private async updateBadge(): Promise<void> {
    const totalDLPFindings = Array.from(this.sessions.values())
      .reduce((sum, session) => sum + session.dlpFindings, 0);

    if (totalDLPFindings > 0) {
      await chrome.action.setBadgeText({ text: totalDLPFindings.toString() });
      await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  }

  getSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
}

// Initialize background service worker
new PromptTrapBackground();
