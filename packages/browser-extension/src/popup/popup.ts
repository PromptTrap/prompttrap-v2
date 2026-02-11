/**
 * Extension popup UI logic
 */

interface Session {
  sessionId: string;
  domain: string;
  aiService: string;
  startTime: number;
  eventCount: number;
  dlpFindings: number;
}

class PopupUI {
  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadSessions();
    this.attachEventListeners();
  }

  private async loadSessions(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['events']);
      const events = result.events || [];

      // Aggregate events by session
      const sessionMap = new Map<string, Session>();

      for (const event of events) {
        const session = sessionMap.get(event.session_id);
        if (session) {
          session.eventCount++;
          session.dlpFindings += event.dlp_findings.length;
        } else {
          sessionMap.set(event.session_id, {
            sessionId: event.session_id,
            domain: event.domain,
            aiService: event.ai_service,
            startTime: new Date(event.timestamp).getTime(),
            eventCount: 1,
            dlpFindings: event.dlp_findings.length,
          });
        }
      }

      const sessions = Array.from(sessionMap.values());
      this.renderSessions(sessions);
      this.updateStats(sessions);
    } catch (e) {
      console.error('Failed to load sessions:', e);
    }
  }

  private renderSessions(sessions: Session[]): void {
    const sessionList = document.getElementById('session-list');
    if (!sessionList) return;

    if (sessions.length === 0) {
      sessionList.innerHTML = '<div class="empty-state">No sessions yet. Visit an AI service to start monitoring.</div>';
      return;
    }

    // Sort by start time descending
    sessions.sort((a, b) => b.startTime - a.startTime);

    sessionList.innerHTML = sessions.slice(0, 5).map(session => {
      const className = session.dlpFindings > 0 ? (session.dlpFindings > 2 ? 'error' : 'warning') : '';
      const timeAgo = this.getTimeAgo(session.startTime);

      return `
        <div class="session-item ${className}">
          <div class="session-header">${session.aiService}</div>
          <div class="session-meta">
            ${session.domain} • ${session.eventCount} events
            ${session.dlpFindings > 0 ? `• ⚠️ ${session.dlpFindings} DLP findings` : ''}
            • ${timeAgo}
          </div>
        </div>
      `;
    }).join('');
  }

  private updateStats(sessions: Session[]): void {
    const uniqueServices = new Set(sessions.map(s => s.aiService));
    const totalDLPFindings = sessions.reduce((sum, s) => sum + s.dlpFindings, 0);

    const servicesEl = document.getElementById('ai-services-count');
    const findingsEl = document.getElementById('dlp-findings-count');

    if (servicesEl) servicesEl.textContent = uniqueServices.size.toString();
    if (findingsEl) findingsEl.textContent = totalDLPFindings.toString();
  }

  private getTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  private attachEventListeners(): void {
    // Monitoring toggle
    const toggle = document.getElementById('monitoring-toggle');
    toggle?.addEventListener('click', async () => {
      const isActive = toggle.classList.contains('active');
      if (isActive) {
        toggle.classList.remove('active');
        await chrome.storage.local.set({ monitoringEnabled: false });
      } else {
        toggle.classList.add('active');
        await chrome.storage.local.set({ monitoringEnabled: true });
      }
    });

    // Open dashboard
    document.getElementById('open-dashboard')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://127.0.0.1:9099' });
    });

    // Clear data
    document.getElementById('clear-data')?.addEventListener('click', async () => {
      if (confirm('Clear all session data?')) {
        await chrome.storage.local.remove('events');
        await this.loadSessions();
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PopupUI();
  });
} else {
  new PopupUI();
}
