// Claude-specific content script
class ClaudeDetector extends LLMContentCommon {
  constructor() {
    super();
    this.messageSelector = '[data-is-streaming], .font-claude-message';
    this.inputSelector = 'div[contenteditable="true"]';
    this.submitSelector = 'button[aria-label*="Send"], button[aria-label*="送信"]';
    this.observer = null;
    this.lastProcessedCount = 0;
    
    console.log('Claude Knowledge Hub detector initialized');
    this.startMonitoring();
  }

  getInputElement() {
    // Claude uses a contenteditable div
    return document.querySelector(this.inputSelector);
  }

  getSubmitButton() {
    return document.querySelector(this.submitSelector);
  }

  getMessages() {
    // Claude's message structure is different
    const messageContainers = document.querySelectorAll('[class*="message"], .font-claude-message');
    const messages = [];
    
    messageContainers.forEach(container => {
      const role = this.determineMessageRole(container);
      const content = this.extractMessageContent(container);
      
      if (role && content) {
        messages.push({
          role: role,
          content: content,
          element: container
        });
      }
    });
    
    return messages;
  }

  determineMessageRole(element) {
    // Claude uses different ways to indicate message role
    const text = element.textContent;
    const classes = element.className;
    
    // Look for user indicators
    if (classes.includes('user') || 
        element.querySelector('[class*="user"]') ||
        element.closest('[data-role="user"]')) {
      return 'user';
    }
    
    // Look for assistant indicators
    if (classes.includes('assistant') || 
        classes.includes('claude') ||
        element.querySelector('[class*="assistant"]') ||
        element.querySelector('[class*="claude"]') ||
        element.closest('[data-role="assistant"]')) {
      return 'assistant';
    }
    
    // Fallback: alternate between user and assistant
    const allMessages = document.querySelectorAll('[class*="message"], .font-claude-message');
    const index = Array.from(allMessages).indexOf(element);
    return index % 2 === 0 ? 'user' : 'assistant';
  }

  extractMessageContent(messageElement) {
    // Remove any UI elements that shouldn't be part of the content
    const clone = messageElement.cloneNode(true);
    
    // Remove buttons, icons, and other UI elements
    const elementsToRemove = clone.querySelectorAll('button, svg, [class*="icon"], [class*="button"]');
    elementsToRemove.forEach(el => el.remove());
    
    return clone.textContent.trim();
  }

  detectModel() {
    // Try to detect Claude model version
    const modelIndicators = [
      '.model-selector',
      '[class*="model"]',
      '.text-xs.text-gray-500'
    ];
    
    for (const selector of modelIndicators) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.toLowerCase();
        if (text.includes('claude-3-opus')) return 'claude-3-opus';
        if (text.includes('claude-3-sonnet')) return 'claude-3-sonnet';
        if (text.includes('claude-3-haiku')) return 'claude-3-haiku';
        if (text.includes('claude-3')) return 'claude-3';
        if (text.includes('claude-2')) return 'claude-2';
      }
    }
    
    return 'claude';
  }

  startMonitoring() {
    // Monitor for new messages
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-is-streaming']
    });

    // Monitor input for recommendations
    this.setupInputMonitoring();

    // Initial scan
    this.processCurrentConversation();

    console.log('Claude monitoring started');
  }

  handleMutations(mutations) {
    let hasNewMessages = false;
    let streamingFinished = false;
    
    for (const mutation of mutations) {
      // Check for new message elements
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches && node.matches('[class*="message"]')) {
            hasNewMessages = true;
          } else if (node.querySelector && node.querySelector('[class*="message"]')) {
            hasNewMessages = true;
          }
        }
      }
      
      // Check for streaming completion
      if (mutation.type === 'attributes' && 
          mutation.attributeName === 'data-is-streaming' && 
          mutation.target.getAttribute('data-is-streaming') === 'false') {
        streamingFinished = true;
      }
    }

    if (hasNewMessages || streamingFinished) {
      this.debounceConversationProcessing(() => {
        this.processCurrentConversation();
      }, 2000);
    }
  }

  processCurrentConversation() {
    const messages = this.getMessages();
    
    // Only process if we have new messages
    if (messages.length <= this.lastProcessedCount) {
      return;
    }

    console.log(`Processing Claude conversation with ${messages.length} messages`);
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
    // Claude might have the title in different places
    const titleElement = document.querySelector('title');
    if (titleElement && !titleElement.textContent.includes('Claude')) {
      return titleElement.textContent;
    }
    
    // Try to find conversation title in the UI
    const uiTitle = document.querySelector('.conversation-title, [class*="title"]');
    if (uiTitle) {
      return uiTitle.textContent.trim();
    }
    
    return 'Claude Conversation';
  }

  setupInputMonitoring() {
    let inputTimeout;
    
    const inputElement = this.getInputElement();
    if (inputElement) {
      // For contenteditable divs, we need to listen to different events
      ['input', 'paste', 'keyup'].forEach(eventType => {
        inputElement.addEventListener(eventType, (e) => {
          clearTimeout(inputTimeout);
          inputTimeout = setTimeout(async () => {
            const value = e.target.textContent || e.target.innerText || '';
            if (value.length > 50) {
              const recommendations = await this.getRecommendations(value);
              if (recommendations && recommendations.length > 0) {
                this.showRecommendations(recommendations, inputElement);
              }
            }
          }, 1000);
        });
      });
    } else {
      // Retry finding input element
      setTimeout(() => this.setupInputMonitoring(), 2000);
    }
  }

  executePrompt(prompt) {
    const inputElement = this.getInputElement();
    if (inputElement) {
      // For contenteditable divs
      inputElement.innerHTML = prompt;
      inputElement.textContent = prompt;
      inputElement.focus();
      
      // Trigger events for contenteditable
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Try to submit
      const submitButton = this.getSubmitButton();
      if (submitButton && !submitButton.disabled) {
        setTimeout(() => submitButton.click(), 500);
      }
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
    new ClaudeDetector();
  });
} else {
  new ClaudeDetector();
}