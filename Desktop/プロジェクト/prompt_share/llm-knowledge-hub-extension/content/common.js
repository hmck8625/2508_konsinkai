// Common utilities for all content scripts
class LLMContentCommon {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.conversationData = [];
    this.lastMessageTime = 0;
    this.isCollecting = true;
    this.debounceTimer = null;
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Send conversation data to background script
  async sendConversationToBackground(conversationData) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'conversationDetected',
        data: conversationData
      });

      if (response && response.success) {
        console.log('Conversation sent successfully:', response.assessment);
        this.showSuccessIndicator();
      } else {
        console.warn('Failed to send conversation:', response.error);
      }
    } catch (error) {
      console.error('Error sending conversation:', error);
    }
  }

  // Get recommendations based on current input
  async getRecommendations(partialPrompt) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getRecommendations',
        data: { query: partialPrompt }
      });

      if (response && response.success) {
        return response.recommendations;
      }
    } catch (error) {
      console.error('Error getting recommendations:', error);
    }
    return [];
  }

  // Execute prompt in current platform
  async executePrompt(prompt) {
    const inputElement = this.getInputElement();
    if (inputElement) {
      inputElement.value = prompt;
      inputElement.focus();
      
      // Trigger input events
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Auto-submit if setting is enabled
      const submitButton = this.getSubmitButton();
      if (submitButton) {
        setTimeout(() => submitButton.click(), 500);
      }
    }
  }

  // Show visual feedback for successful data collection
  showSuccessIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'llm-hub-success-indicator';
    indicator.innerHTML = '✅ Saved to Knowledge Hub';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-size: 14px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(indicator);
    
    setTimeout(() => {
      indicator.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => indicator.remove(), 300);
    }, 2000);
  }

  // Show recommendation popup
  showRecommendations(recommendations, inputElement) {
    // Remove existing popup
    const existing = document.querySelector('.llm-hub-recommendations');
    if (existing) existing.remove();

    if (!recommendations || recommendations.length === 0) return;

    const popup = document.createElement('div');
    popup.className = 'llm-hub-recommendations';
    popup.innerHTML = `
      <div class="recommendations-header">
        <span>💡 Similar prompts</span>
        <button class="close-btn">×</button>
      </div>
      ${recommendations.map(rec => `
        <div class="recommendation-item" data-prompt="${this.escapeHtml(rec.prompt)}">
          <div class="recommendation-title">${this.truncate(rec.title, 50)}</div>
          <div class="recommendation-preview">${this.truncate(rec.preview, 80)}</div>
        </div>
      `).join('')}
    `;

    // Position near input element
    const rect = inputElement.getBoundingClientRect();
    popup.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 10}px;
      left: ${rect.left}px;
      width: ${Math.max(300, rect.width)}px;
      max-height: 200px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      overflow-y: auto;
    `;

    document.body.appendChild(popup);

    // Add event listeners
    popup.querySelector('.close-btn').addEventListener('click', () => popup.remove());
    
    popup.querySelectorAll('.recommendation-item').forEach(item => {
      item.addEventListener('click', () => {
        const prompt = item.dataset.prompt;
        this.executePrompt(prompt);
        popup.remove();
      });
    });

    // Auto-hide after 10 seconds
    setTimeout(() => popup.remove(), 10000);
  }

  // Debounced conversation processing
  debounceConversationProcessing(callback, delay = 2000) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(callback, delay);
  }

  // Extract conversation data from messages
  extractConversationData(messages) {
    console.log(`[Common] Extracting conversation data from ${messages.length} messages`);
    
    if (messages.length < 2) {
      console.log('[Common] Not enough messages for conversation');
      return null;
    }

    // Filter and validate messages
    const userMessages = messages.filter(m => {
      const isUser = m.role === 'user';
      const hasContent = m.content && m.content.trim().length > 0;
      console.log(`[Common] Message role=${m.role}, hasContent=${hasContent}, content=${m.content?.substring(0, 50)}...`);
      return isUser && hasContent;
    });
    
    const assistantMessages = messages.filter(m => {
      const isAssistant = m.role === 'assistant';
      const hasContent = m.content && m.content.trim().length > 0;
      return isAssistant && hasContent;
    });

    console.log(`[Common] Found ${userMessages.length} user messages and ${assistantMessages.length} assistant messages`);

    if (userMessages.length === 0 || assistantMessages.length === 0) {
      console.log('[Common] Missing user or assistant messages');
      return null;
    }

    const lastUserMessage = userMessages[userMessages.length - 1];
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];

    // Validate content is different (prevent duplicate content issue)
    if (lastUserMessage.content.trim() === lastAssistantMessage.content.trim()) {
      console.log('[Common] User and assistant content are identical - skipping');
      return null;
    }

    const extractedData = {
      prompt: lastUserMessage.content.trim(),
      response: lastAssistantMessage.content.trim(),
      model: this.detectModel(),
      sessionId: this.sessionId,
      conversationLength: messages.length,
      estimatedTokens: this.estimateTokens(lastUserMessage.content + lastAssistantMessage.content)
    };
    
    console.log('[Common] Successfully extracted conversation data:', {
      promptLength: extractedData.prompt.length,
      responseLength: extractedData.response.length,
      model: extractedData.model
    });

    return extractedData;
  }

  // Estimate token count (rough approximation)
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  // Detect AI model being used (platform-specific implementation needed)
  detectModel() {
    return 'unknown';
  }

  // Utility functions
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  truncate(text, length) {
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  // Abstract methods to be implemented by platform-specific scripts
  getInputElement() {
    throw new Error('getInputElement must be implemented by platform-specific script');
  }

  getSubmitButton() {
    throw new Error('getSubmitButton must be implemented by platform-specific script');
  }

  getMessages() {
    throw new Error('getMessages must be implemented by platform-specific script');
  }

  startMonitoring() {
    throw new Error('startMonitoring must be implemented by platform-specific script');
  }
}

// CSS animations for indicators
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .llm-hub-recommendations {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .recommendations-header {
    padding: 12px;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    font-size: 13px;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #666;
  }
  
  .close-btn:hover {
    color: #333;
  }
  
  .recommendation-item {
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .recommendation-item:hover {
    background-color: #f8f9fa;
  }
  
  .recommendation-item:last-child {
    border-bottom: none;
  }
  
  .recommendation-title {
    font-weight: 600;
    font-size: 13px;
    color: #202124;
    margin-bottom: 4px;
  }
  
  .recommendation-preview {
    font-size: 11px;
    color: #5f6368;
    line-height: 1.4;
  }
`;
document.head.appendChild(style);