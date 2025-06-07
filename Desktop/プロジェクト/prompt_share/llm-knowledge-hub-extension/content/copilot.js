// Microsoft Copilot-specific content script
class CopilotDetector extends LLMContentCommon {
  constructor() {
    super();
    this.messageSelector = '.ac-textBlock, [class*="message"]';
    this.inputSelector = '#userInput, .as-input, textarea[placeholder*="Ask"]';
    this.submitSelector = '#submit-button, .submit-icon, [aria-label*="Send"]';
    this.observer = null;
    this.lastProcessedCount = 0;
    
    console.log('Copilot Knowledge Hub detector initialized');
    this.startMonitoring();
  }

  getInputElement() {
    // Copilot may use different input types
    return document.querySelector(this.inputSelector);
  }

  getSubmitButton() {
    return document.querySelector(this.submitSelector);
  }

  getMessages() {
    const messageElements = document.querySelectorAll(this.messageSelector);
    const messages = [];
    
    messageElements.forEach(element => {
      const role = this.determineMessageRole(element);
      const content = this.extractMessageContent(element);
      
      if (role && content && content.length > 10) {
        messages.push({
          role: role,
          content: content,
          element: element
        });
      }
    });
    
    return messages;
  }

  determineMessageRole(element) {
    const classes = element.className.toLowerCase();
    const parentClasses = element.parentElement?.className?.toLowerCase() || '';
    const text = element.textContent;
    
    // Look for user message indicators
    if (classes.includes('user') || 
        parentClasses.includes('user') ||
        element.closest('[class*="user"]')) {
      return 'user';
    }
    
    // Look for assistant/bot indicators
    if (classes.includes('bot') || 
        classes.includes('assistant') ||
        classes.includes('copilot') ||
        parentClasses.includes('bot') ||
        element.closest('[class*="bot"]') ||
        element.closest('[class*="assistant"]')) {
      return 'assistant';
    }
    
    // Copilot specific patterns
    if (element.querySelector('.ac-image') || 
        element.querySelector('[class*="avatar"]')) {
      return 'assistant';
    }
    
    // If no clear indication, try to infer from position or content
    const allMessages = document.querySelectorAll(this.messageSelector);
    const index = Array.from(allMessages).indexOf(element);
    
    // Alternate pattern (assuming conversation starts with user)
    return index % 2 === 0 ? 'user' : 'assistant';
  }

  extractMessageContent(messageElement) {
    // Clone to avoid modifying the original
    const clone = messageElement.cloneNode(true);
    
    // Remove UI elements that shouldn't be part of content
    const elementsToRemove = clone.querySelectorAll(
      'button, .ac-pushButton, .ac-actionSet, svg, [class*="button"], [class*="icon"], .feedback'
    );
    elementsToRemove.forEach(el => el.remove());
    
    return clone.textContent.trim();
  }

  detectModel() {
    // Try to detect Copilot model/version
    const modelIndicators = [
      '.model-info',
      '.version-info',
      '[class*="model"]'
    ];
    
    for (const selector of modelIndicators) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.toLowerCase();
        if (text.includes('gpt-4')) return 'copilot-gpt-4';
        if (text.includes('gpt-3.5')) return 'copilot-gpt-3.5';
      }
    }
    
    // Check URL for version info
    if (window.location.href.includes('bing.com')) {
      return 'bing-chat';
    }
    
    return 'copilot';
  }

  startMonitoring() {
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });

    this.setupInputMonitoring();
    this.processCurrentConversation();

    console.log('Copilot monitoring started');
  }

  handleMutations(mutations) {
    let hasNewMessages = false;
    
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check for new message content
          if (node.matches && (
              node.matches('.ac-textBlock') || 
              node.matches('[class*="message"]')
          )) {
            hasNewMessages = true;
          } else if (node.querySelector && (
              node.querySelector('.ac-textBlock') || 
              node.querySelector('[class*="message"]')
          )) {
            hasNewMessages = true;
          }
        }
      }
    }

    if (hasNewMessages) {
      this.debounceConversationProcessing(() => {
        this.processCurrentConversation();
      }, 3000);
    }
  }

  processCurrentConversation() {
    const messages = this.getMessages();
    
    if (messages.length <= this.lastProcessedCount) {
      return;
    }

    console.log(`Processing Copilot conversation with ${messages.length} messages`);
    this.lastProcessedCount = messages.length;

    const conversationData = this.extractConversationData(messages);
    
    if (conversationData) {
      conversationData.model = this.detectModel();
      conversationData.url = window.location.href;
      conversationData.title = this.getConversationTitle();
      
      this.sendConversationToBackground(conversationData);
    }
  }

  getConversationTitle() {
    const titleElement = document.querySelector('title');
    if (titleElement && !titleElement.textContent.includes('Copilot')) {
      return titleElement.textContent;
    }
    
    // Try to find conversation context
    const contextElement = document.querySelector('.conversation-title, .chat-title');
    if (contextElement) {
      return contextElement.textContent.trim();
    }
    
    return 'Copilot Conversation';
  }

  setupInputMonitoring() {
    let inputTimeout;
    
    const inputElement = this.getInputElement();
    if (inputElement) {
      inputElement.addEventListener('input', (e) => {
        clearTimeout(inputTimeout);
        inputTimeout = setTimeout(async () => {
          const value = e.target.value;
          if (value.length > 50) {
            const recommendations = await this.getRecommendations(value);
            if (recommendations && recommendations.length > 0) {
              this.showRecommendations(recommendations, inputElement);
            }
          }
        }, 1000);
      });
    } else {
      // Retry finding input element
      setTimeout(() => this.setupInputMonitoring(), 2000);
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'executePrompt') {
        this.executePrompt(request.prompt);
        sendResponse({ success: true });
      }
    });
  }
}

// Initialize when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CopilotDetector();
  });
} else {
  new CopilotDetector();
}