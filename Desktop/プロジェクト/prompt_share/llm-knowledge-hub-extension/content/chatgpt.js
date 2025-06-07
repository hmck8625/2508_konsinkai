// ChatGPT-specific content script
class ChatGPTDetector extends LLMContentCommon {
  constructor() {
    super();
    this.messageSelector = '[data-message-author-role]';
    this.inputSelector = '#prompt-textarea';
    this.submitSelector = '[data-testid="send-button"]';
    this.observer = null;
    this.lastProcessedCount = 0;
    
    console.log('ChatGPT Knowledge Hub detector initialized');
    this.startMonitoring();
  }

  getInputElement() {
    return document.querySelector(this.inputSelector);
  }

  getSubmitButton() {
    return document.querySelector(this.submitSelector);
  }

  getMessages() {
    const messageElements = document.querySelectorAll(this.messageSelector);
    return Array.from(messageElements).map(element => {
      const role = element.getAttribute('data-message-author-role');
      const content = this.extractMessageContent(element);
      
      return {
        role: role,
        content: content,
        element: element
      };
    });
  }

  extractMessageContent(messageElement) {
    // ChatGPT message content is usually in a div with prose class
    const contentElement = messageElement.querySelector('.prose, [class*="prose"]') || 
                          messageElement.querySelector('div > div > div') ||
                          messageElement;
    
    return contentElement.textContent.trim();
  }

  detectModel() {
    // Try to detect model from UI elements
    const modelIndicators = [
      '.model-switcher',
      '[title*="GPT"]',
      '.text-token-text-secondary'
    ];
    
    for (const selector of modelIndicators) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.toLowerCase();
        if (text.includes('gpt-4')) return 'gpt-4';
        if (text.includes('gpt-3.5')) return 'gpt-3.5-turbo';
      }
    }
    
    return 'chatgpt';
  }

  startMonitoring() {
    // Monitor for new messages
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });

    // Also monitor input for recommendations
    this.setupInputMonitoring();

    // Initial scan for existing messages
    this.processCurrentConversation();

    console.log('ChatGPT monitoring started');
  }

  handleMutations(mutations) {
    let hasNewMessages = false;
    
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if new message was added
          if (node.matches && node.matches(this.messageSelector)) {
            hasNewMessages = true;
          } else if (node.querySelector && node.querySelector(this.messageSelector)) {
            hasNewMessages = true;
          }
        }
      }
    }

    if (hasNewMessages) {
      this.debounceConversationProcessing(() => {
        this.processCurrentConversation();
      }, 3000); // Wait 3 seconds after last message
    }
  }

  processCurrentConversation() {
    const messages = this.getMessages();
    
    // Only process if we have new messages
    if (messages.length <= this.lastProcessedCount) {
      return;
    }

    console.log(`Processing conversation with ${messages.length} messages`);
    this.lastProcessedCount = messages.length;

    // Extract conversation data
    const conversationData = this.extractConversationData(messages);
    
    if (conversationData) {
      // Add ChatGPT-specific metadata
      conversationData.model = this.detectModel();
      conversationData.url = window.location.href;
      conversationData.title = this.getConversationTitle();
      
      this.sendConversationToBackground(conversationData);
    }
  }

  getConversationTitle() {
    const titleElement = document.querySelector('title');
    if (titleElement && titleElement.textContent !== 'ChatGPT') {
      return titleElement.textContent;
    }
    
    // Try to get title from sidebar
    const sidebarTitle = document.querySelector('.flex-1.text-ellipsis.max-h-5');
    if (sidebarTitle) {
      return sidebarTitle.textContent.trim();
    }
    
    return 'ChatGPT Conversation';
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

  // Listen for execute prompt messages from background
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
    new ChatGPTDetector();
  });
} else {
  new ChatGPTDetector();
}