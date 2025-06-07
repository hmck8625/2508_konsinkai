// Manual Collection Button for LLM Platforms
class ManualCollector extends LLMContentCommon {
  constructor() {
    super();
    this.collectButton = null;
    this.isCollecting = false;
    this.previewModal = null;
    
    console.log('Manual Collector initialized');
    this.initializePreviewModal();
    this.createCollectionButton();
    this.monitorPageChanges();
  }

  initializePreviewModal() {
    // Initialize preview modal if PreviewModal class exists
    if (typeof PreviewModal !== 'undefined') {
      this.previewModal = new PreviewModal();
    } else {
      console.warn('PreviewModal class not found');
    }
  }

  createCollectionButton() {
    // Remove existing button if any
    const existingButton = document.querySelector('.llm-hub-collect-btn');
    if (existingButton) {
      existingButton.remove();
    }

    // Create collection button
    this.collectButton = document.createElement('button');
    this.collectButton.className = 'llm-hub-collect-btn';
    this.collectButton.innerHTML = `
      <span class="btn-icon">📊</span>
      <span class="btn-text">収集</span>
    `;
    
    // Style the button
    this.collectButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: linear-gradient(135deg, #4285f4, #34a853);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Add hover effect
    this.collectButton.addEventListener('mouseenter', () => {
      this.collectButton.style.transform = 'translateY(-2px)';
      this.collectButton.style.boxShadow = '0 6px 16px rgba(66, 133, 244, 0.4)';
    });

    this.collectButton.addEventListener('mouseleave', () => {
      this.collectButton.style.transform = 'translateY(0)';
      this.collectButton.style.boxShadow = '0 4px 12px rgba(66, 133, 244, 0.3)';
    });

    // Add click handler
    this.collectButton.addEventListener('click', () => {
      this.collectCurrentConversation();
    });

    // Add to page
    document.body.appendChild(this.collectButton);
    
    // Show button only on supported platforms
    this.updateButtonVisibility();
  }

  updateButtonVisibility() {
    const currentPlatform = this.detectCurrentPlatform();
    if (currentPlatform === 'unknown') {
      this.collectButton.style.display = 'none';
    } else {
      this.collectButton.style.display = 'flex';
      // Update button text based on platform
      const platformNames = {
        chatgpt: 'ChatGPT',
        claude: 'Claude',
        copilot: 'Copilot',
        bard: 'Bard'
      };
      this.collectButton.querySelector('.btn-text').textContent = 
        `${platformNames[currentPlatform]}を収集`;
    }
  }

  detectCurrentPlatform() {
    const url = window.location.href;
    if (url.includes('chat.openai.com')) return 'chatgpt';
    if (url.includes('claude.ai')) return 'claude';
    if (url.includes('copilot.microsoft.com')) return 'copilot';
    if (url.includes('bard.google.com')) return 'bard';
    return 'unknown';
  }

  async collectCurrentConversation() {
    if (this.isCollecting) return;

    this.isCollecting = true;
    this.updateButtonState('collecting');

    try {
      const platform = this.detectCurrentPlatform();
      const messages = this.getMessagesForPlatform(platform);
      
      if (messages.length === 0) {
        this.showMessage('収集できる会話が見つかりません', 'warning');
        return;
      }

      // Extract conversation data
      const conversationData = this.extractConversationFromMessages(messages);
      
      if (!conversationData) {
        this.showMessage('有効な会話データが見つかりません', 'warning');
        return;
      }

      // Add platform-specific metadata
      conversationData.platform = platform;
      conversationData.url = window.location.href;
      conversationData.title = this.getPageTitle();
      conversationData.collectedManually = true;
      conversationData.timestamp = new Date().toISOString();

      // Send to background script
      const response = await chrome.runtime.sendMessage({
        action: 'conversationDetected',
        data: conversationData
      });

      if (response && response.success) {
        this.showMessage('会話を収集しました！', 'success');
        this.updateButtonState('success');
        
        // Show preview modal
        this.showPreviewModal(conversationData);
      } else {
        this.showMessage('収集に失敗しました', 'error');
        this.updateButtonState('error');
      }

    } catch (error) {
      console.error('Collection failed:', error);
      this.showMessage('収集中にエラーが発生しました', 'error');
      this.updateButtonState('error');
    } finally {
      // Reset button state after 3 seconds
      setTimeout(() => {
        this.isCollecting = false;
        this.updateButtonState('normal');
      }, 3000);
    }
  }

  getMessagesForPlatform(platform) {
    switch (platform) {
      case 'chatgpt':
        return this.getChatGPTMessages();
      case 'claude':
        return this.getClaudeMessages();
      case 'copilot':
        return this.getCopilotMessages();
      case 'bard':
        return this.getBardMessages();
      default:
        return [];
    }
  }

  getChatGPTMessages() {
    const messageElements = document.querySelectorAll('[data-message-author-role]');
    return Array.from(messageElements).map(element => {
      const role = element.getAttribute('data-message-author-role');
      const content = this.extractTextContent(element);
      return { role, content, element };
    }).filter(msg => msg.content.length > 10);
  }

  getClaudeMessages() {
    const messageElements = document.querySelectorAll('[data-is-streaming], .font-claude-message, [class*="message"]');
    const messages = [];
    
    messageElements.forEach((element, index) => {
      const content = this.extractTextContent(element);
      if (content.length > 10) {
        // Alternate between user and assistant for Claude
        const role = index % 2 === 0 ? 'user' : 'assistant';
        messages.push({ role, content, element });
      }
    });
    
    return messages;
  }

  getCopilotMessages() {
    const messageElements = document.querySelectorAll('.ac-textBlock, [class*="message"]');
    return Array.from(messageElements).map((element, index) => {
      const content = this.extractTextContent(element);
      if (content.length > 10) {
        // Determine role based on element classes or position
        const role = this.determineCopilotRole(element, index);
        return { role, content, element };
      }
    }).filter(Boolean);
  }

  getBardMessages() {
    // Placeholder for Bard implementation
    return [];
  }

  determineCopilotRole(element, index) {
    const classes = element.className.toLowerCase();
    if (classes.includes('user')) return 'user';
    if (classes.includes('bot') || classes.includes('assistant')) return 'assistant';
    // Default alternating pattern
    return index % 2 === 0 ? 'user' : 'assistant';
  }

  extractTextContent(element) {
    // Clone element to avoid modifying original
    const clone = element.cloneNode(true);
    
    // Remove buttons, icons, and other UI elements
    const elementsToRemove = clone.querySelectorAll(
      'button, svg, [class*="icon"], [class*="button"], .feedback, [data-testid*="button"]'
    );
    elementsToRemove.forEach(el => el.remove());
    
    return clone.textContent.trim();
  }

  extractConversationFromMessages(messages) {
    if (messages.length < 2) return null;

    // Get last user message and last assistant message
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    if (userMessages.length === 0 || assistantMessages.length === 0) return null;

    const lastUserMessage = userMessages[userMessages.length - 1];
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];

    return {
      prompt: lastUserMessage.content,
      response: lastAssistantMessage.content,
      conversationLength: messages.length,
      estimatedTokens: this.estimateTokens(lastUserMessage.content + lastAssistantMessage.content),
      fullConversation: messages.map(m => ({ role: m.role, content: m.content }))
    };
  }

  getPageTitle() {
    const title = document.title;
    if (title && !title.includes('ChatGPT') && !title.includes('Claude')) {
      return title;
    }
    
    // Try to find conversation title in UI
    const titleSelectors = [
      '.conversation-title',
      '[class*="title"]',
      '.flex-1.text-ellipsis',
      'h1'
    ];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    
    return 'LLM Conversation';
  }

  updateButtonState(state) {
    const icon = this.collectButton.querySelector('.btn-icon');
    const text = this.collectButton.querySelector('.btn-text');
    
    switch (state) {
      case 'collecting':
        icon.textContent = '⏳';
        text.textContent = '収集中...';
        this.collectButton.style.background = 'linear-gradient(135deg, #ff9800, #f57c00)';
        this.collectButton.disabled = true;
        break;
      
      case 'success':
        icon.textContent = '✅';
        text.textContent = '収集完了！';
        this.collectButton.style.background = 'linear-gradient(135deg, #4caf50, #388e3c)';
        break;
      
      case 'error':
        icon.textContent = '❌';
        text.textContent = '収集失敗';
        this.collectButton.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
        break;
      
      default: // normal
        icon.textContent = '📊';
        const platform = this.detectCurrentPlatform();
        const platformNames = {
          chatgpt: 'ChatGPT',
          claude: 'Claude',
          copilot: 'Copilot',
          bard: 'Bard'
        };
        text.textContent = `${platformNames[platform] || 'LLM'}を収集`;
        this.collectButton.style.background = 'linear-gradient(135deg, #4285f4, #34a853)';
        this.collectButton.disabled = false;
        break;
    }
  }

  showMessage(message, type) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'llm-hub-toast';
    toast.innerHTML = `
      <span class="toast-icon">${this.getToastIcon(type)}</span>
      <span class="toast-message">${message}</span>
    `;
    
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10001;
      background: ${this.getToastColor(type)};
      color: white;
      border-radius: 6px;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideInToast 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOutToast 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  getToastIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  getToastColor(type) {
    const colors = {
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196f3'
    };
    return colors[type] || colors.info;
  }

  monitorPageChanges() {
    // Monitor for navigation changes (SPA)
    let currentURL = window.location.href;
    
    const checkURLChange = () => {
      if (window.location.href !== currentURL) {
        currentURL = window.location.href;
        this.updateButtonVisibility();
      }
    };
    
    // Check every second for URL changes
    setInterval(checkURLChange, 1000);
    
    // Also listen for popstate events
    window.addEventListener('popstate', () => {
      setTimeout(() => this.updateButtonVisibility(), 100);
    });
  }

  // Override base class methods that are not needed for manual collection
  startMonitoring() {
    // No automatic monitoring needed
  }

  getInputElement() {
    // Not needed for manual collection
    return null;
  }

  getSubmitButton() {
    // Not needed for manual collection
    return null;
  }

  getMessages() {
    // Implemented in getMessagesForPlatform
    return [];
  }

  showPreviewModal(conversationData) {
    // Show detailed toast immediately
    this.showDetailedToast(conversationData);
  }

  showDetailedToast(data) {
    const toast = document.createElement('div');
    toast.className = 'llm-hub-detailed-toast';
    toast.innerHTML = `
      <div class="toast-header">
        <span class="toast-title">📊 収集完了</span>
        <button class="toast-close">×</button>
      </div>
      <div class="toast-content">
        <div class="toast-meta">
          ${this.getPlatformName(this.detectCurrentPlatform())} • ${data.conversationLength || 2}往復
        </div>
        <div class="toast-preview">
          <strong>プロンプト:</strong> ${this.truncateText(data.prompt, 100)}<br>
          <strong>応答:</strong> ${this.truncateText(data.response, 100)}
        </div>
        <div class="toast-actions">
          <button class="toast-btn" id="viewFullToast">詳細を表示</button>
          <button class="toast-btn" id="copyToast">コピー</button>
        </div>
      </div>
    `;
    
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10001;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slideInToast 0.3s ease;
      border: 1px solid #e0e0e0;
    `;

    document.body.appendChild(toast);

    // Event listeners
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    toast.querySelector('#viewFullToast').addEventListener('click', () => {
      toast.remove();
      this.showConversationDetails(data);
    });

    toast.querySelector('#copyToast').addEventListener('click', async () => {
      const text = `プロンプト: ${data.prompt}

応答: ${data.response}`;
      try {
        await navigator.clipboard.writeText(text);
        this.showMessage('クリップボードにコピーしました', 'success');
      } catch (err) {
        console.error('Copy failed:', err);
      }
      toast.remove();
    });

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 10000);
  }

  showConversationDetails(data) {
    const details = document.createElement('div');
    details.className = 'llm-hub-simple-details';
    details.innerHTML = `
      <div class="details-overlay">
        <div class="details-content">
          <div class="details-header">
            <h3>📊 収集された会話</h3>
            <button class="details-close">×</button>
          </div>
          <div class="details-body">
            <div class="detail-section">
              <h4>👤 プロンプト (${data.prompt?.length || 0}文字)</h4>
              <div class="detail-text">${this.escapeHtml(data.prompt || 'プロンプトが見つかりません')}</div>
            </div>
            <div class="detail-section">
              <h4>🤖 応答 (${data.response?.length || 0}文字)</h4>
              <div class="detail-text">${this.escapeHtml(data.response || '応答が見つかりません')}</div>
            </div>
          </div>
          <div class="details-footer">
            <button class="details-btn" id="copyDetails">📋 コピー</button>
            <button class="details-btn" id="closeDetails">閉じる</button>
          </div>
        </div>
      </div>
    `;

    details.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 15000;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    document.body.appendChild(details);

    // Event listeners
    const closeModal = () => {
      details.remove();
    };

    details.querySelector('.details-close').addEventListener('click', closeModal);
    details.querySelector('#closeDetails').addEventListener('click', closeModal);
    
    details.querySelector('.details-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    details.querySelector('#copyDetails').addEventListener('click', async () => {
      const text = `プロンプト:
${data.prompt}

応答:
${data.response}`;
      try {
        await navigator.clipboard.writeText(text);
        this.showMessage('クリップボードにコピーしました', 'success');
      } catch (err) {
        console.error('Copy failed:', err);
      }
    });
  }

  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getPlatformName(platform) {
    const names = {
      chatgpt: 'ChatGPT',
      claude: 'Claude', 
      copilot: 'Copilot',
      bard: 'Bard'
    };
    return names[platform] || platform;
  }
}

// Add CSS animations and detailed toast styles
const animationStyle = document.createElement('style');
animationStyle.textContent = `
  @keyframes slideInToast {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOutToast {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }

  .toast-header {
    padding: 12px 16px;
    background: linear-gradient(135deg, #4285f4, #34a853);
    color: white;
    border-radius: 8px 8px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .toast-title {
    font-weight: 600;
    font-size: 14px;
  }
  
  .toast-close {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
  }
  
  .toast-content {
    padding: 16px;
  }
  
  .toast-meta {
    font-size: 12px;
    color: #666;
    margin-bottom: 12px;
  }
  
  .toast-preview {
    font-size: 13px;
    line-height: 1.4;
    margin-bottom: 12px;
    color: #333;
  }
  
  .toast-actions {
    display: flex;
    gap: 8px;
  }
  
  .toast-btn {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #f8f9fa;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .toast-btn:hover {
    background: #e9ecef;
  }

  .details-content {
    background: white;
    border-radius: 8px;
    max-width: 700px;
    width: 100%;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .details-header {
    padding: 16px 20px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
  }
  
  .details-header h3 {
    margin: 0;
    font-size: 16px;
    color: #333;
  }
  
  .details-close {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #666;
  }
  
  .details-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }
  
  .detail-section {
    margin-bottom: 20px;
  }
  
  .detail-section h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }
  
  .detail-text {
    padding: 12px;
    background: #f8f9fa;
    border-radius: 6px;
    white-space: pre-wrap;
    line-height: 1.5;
    font-size: 14px;
    color: #333;
    border: 1px solid #e0e0e0;
  }
  
  .details-footer {
    padding: 16px 20px;
    border-top: 1px solid #e0e0e0;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    background: #f8f9fa;
  }
  
  .details-btn {
    padding: 8px 16px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 13px;
    transition: background-color 0.2s;
  }
  
  .details-btn:hover {
    background: #f0f0f0;
  }
`;
document.head.appendChild(animationStyle);

// Initialize manual collector when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ManualCollector();
  });
} else {
  new ManualCollector();
}