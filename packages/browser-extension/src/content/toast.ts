/**
 * Toast notifications for DLP warnings
 */

export function showToast(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
  const colors = {
    info: { bg: '#3b82f6', text: '#fff' },
    warning: { bg: '#f59e0b', text: '#000' },
    error: { bg: '#ef4444', text: '#fff' },
  };

  const color = colors[type];

  const toast = document.createElement('div');
  toast.innerHTML = `
    <div style="
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${color.bg};
      color: ${color.text};
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      z-index: 1000000;
      max-width: 350px;
      animation: slideIn 0.3s ease-out;
    ">
      ${message}
    </div>
  `;

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(toast);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}
