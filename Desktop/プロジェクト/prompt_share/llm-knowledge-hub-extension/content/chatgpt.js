// ChatGPT-specific content script
class ChatGPTDetector extends LLMContentCommon {
  constructor() {
    super();
    // Multiple selectors for different ChatGPT versions
    this.messageSelectors = [
      '[data-message-author-role]',
      '[data-testid^="conversation-turn"]',
      '.group.w-full.text-token-text-primary',
      '.group .flex.flex-col.text-sm'
    ];
    this.inputSelectors = [
      '#prompt-textarea',
      '[data-id="root"] textarea',
      '.ProseMirror',
      'textarea[placeholder*="message"]'
    ];
    this.submitSelectors = [
      '[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      'button[type="submit"]'
    ];
    this.observer = null;
    this.lastProcessedCount = 0;
    this.debugMode = true;
    
    console.log('ChatGPT Knowledge Hub detector initialized for URL:', window.location.href);
    this.startMonitoring();
  }

  getInputElement() {
    for (const selector of this.inputSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        this.debugLog(`Found input element with selector: ${selector}`);
        return element;
      }
    }
    this.debugLog('No input element found with any selector');
    return null;
  }

  getSubmitButton() {
    for (const selector of this.submitSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        this.debugLog(`Found submit button with selector: ${selector}`);
        return element;
      }
    }
    this.debugLog('No submit button found with any selector');
    return null;
  }

  getMessages() {
    let messageElements = [];
    let usedSelector = '';
    
    // Try each selector until we find messages
    for (const selector of this.messageSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        messageElements = Array.from(elements);
        usedSelector = selector;
        break;
      }
    }
    
    this.debugLog(`Found ${messageElements.length} messages using selector: ${usedSelector}`);
    
    return messageElements.map((element, index) => {
      const role = this.detectMessageRole(element, index);
      const content = this.extractMessageContent(element);
      
      this.debugLog(`Message ${index}: role=${role}, content=${content.substring(0, 100)}...`);
      
      return {
        role: role,
        content: content,
        element: element
      };
    }).filter(msg => msg.content.trim().length > 0);
  }

  detectMessageRole(messageElement, index) {
    // Method 1: Check data-message-author-role attribute
    const authorRole = messageElement.getAttribute('data-message-author-role');
    if (authorRole) {
      this.debugLog(`Role detected from attribute: ${authorRole}`);
      return authorRole;
    }
    
    // Method 2: Check for user/assistant indicators in classes or content
    const elementText = messageElement.textContent.toLowerCase();
    const elementHTML = messageElement.innerHTML.toLowerCase();
    
    // Look for avatar or user indicators
    if (messageElement.querySelector('img[alt*="user"]') || 
        messageElement.querySelector('[class*="user"]') ||
        elementHTML.includes('user') && !elementHTML.includes('assistant')) {
      this.debugLog('Role detected as user from UI indicators');
      return 'user';
    }
    
    // Look for assistant indicators
    if (messageElement.querySelector('img[alt*="gpt"]') ||
        messageElement.querySelector('img[alt*="assistant"]') ||
        messageElement.querySelector('[class*="assistant"]') ||
        elementHTML.includes('assistant') ||
        elementHTML.includes('chatgpt')) {
      this.debugLog('Role detected as assistant from UI indicators');
      return 'assistant';
    }
    
    // Method 3: Alternate based on position (first message usually user)
    const role = index % 2 === 0 ? 'user' : 'assistant';
    this.debugLog(`Role detected by position: ${role} (index: ${index})`);
    return role;
  }
  
  extractMessageContent(messageElement) {
    // Try multiple content extraction methods
    const contentSelectors = [
      '.prose',
      '[class*="prose"]',
      '.markdown',
      '[class*="markdown"]',
      '.whitespace-pre-wrap',
      'div[data-message-content]',
      'div:not([class*="avatar"]):not([class*="button"])'
    ];
    
    for (const selector of contentSelectors) {
      const contentElement = messageElement.querySelector(selector);
      if (contentElement && contentElement.textContent.trim().length > 0) {
        this.debugLog(`Content extracted using selector: ${selector}`);
        return contentElement.textContent.trim();
      }
    }
    
    // Fallback: get all text but exclude button/meta text
    const fullText = messageElement.textContent.trim();
    // Remove common button texts and timestamps
    const cleanedText = fullText.replace(/^\s*(Copy|Regenerate|Share|Like|Dislike)\s*/gm, '')
                                .replace(/\d{1,2}:\d{2}\s*(AM|PM)?/g, '')
                                .trim();
    
    this.debugLog(`Content extracted as fallback: ${cleanedText.substring(0, 100)}...`);
    return cleanedText;
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
          // Check if new message was added using any of our selectors
          for (const selector of this.messageSelectors) {
            if ((node.matches && node.matches(selector)) ||
                (node.querySelector && node.querySelector(selector))) {
              hasNewMessages = true;
              this.debugLog(`New message detected with selector: ${selector}`);
              break;
            }
          }
          if (hasNewMessages) break;
        }
      }
      if (hasNewMessages) break;
    }

    if (hasNewMessages) {
      this.debugLog('Scheduling conversation processing due to new messages');
      this.debounceConversationProcessing(() => {
        this.processCurrentConversation();
      }, 3000); // Wait 3 seconds after last message
    }
  }

  debugLog(message) {
    if (this.debugMode) {
      console.log(`[ChatGPT Extractor Debug] ${message}`);
    }
  }
  
  processCurrentConversation() {
    this.debugLog('Starting conversation processing...');
    const messages = this.getMessages();
    
    // Only process if we have new messages
    if (messages.length <= this.lastProcessedCount) {
      this.debugLog(`No new messages: ${messages.length} <= ${this.lastProcessedCount}`);
      return;
    }

    this.debugLog(`Processing conversation with ${messages.length} messages (last processed: ${this.lastProcessedCount})`);
    this.lastProcessedCount = messages.length;

    // Extract conversation data
    const conversationData = this.extractConversationData(messages);
    
    if (conversationData) {
      // Add ChatGPT-specific metadata
      conversationData.model = this.detectModel();
      conversationData.url = window.location.href;
      conversationData.title = this.getConversationTitle();
      
      this.debugLog(`Extracted conversation data:`, conversationData);
      this.sendConversationToBackground(conversationData);
    } else {
      this.debugLog('No valid conversation data extracted');
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