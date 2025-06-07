// LLM Knowledge Hub - Background Service Worker
// This handles coordination between content scripts, API communication, and storage

class LLMKnowledgeHub {
  constructor() {
    this.apiEndpoint = 'https://api.your-company.com/llm-hub';
    this.authToken = null;
    this.pendingData = [];
    this.settings = {};
    
    this.initializeExtension();
  }

  async initializeExtension() {
    console.log('LLM Knowledge Hub: Initializing...');
    
    // Load settings and auth token
    await this.loadSettings();
    await this.loadAuthToken();
    
    // Set up message listeners
    this.setupMessageListeners();
    
    // Start periodic sync
    this.startPeriodicSync();
    
    console.log('LLM Knowledge Hub: Ready!');
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['settings']);
      this.settings = result.settings || this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      collection: {
        enabled: true,
        mode: 'manual', // 'auto' or 'manual'
        platforms: {
          chatgpt: true,
          claude: true,
          copilot: true,
          bard: false
        },
        minPromptLength: 50,
        minResponseLength: 100
      },
      transmission: {
        realtime: true,
        batchInterval: 5,
        offline: true
      },
      privacy: {
        autoMask: true,
        excludePatterns: ['password', 'confidential', 'secret'],
        manualApproval: false
      },
      ui: {
        showRecommendations: true,
        notificationLevel: 'minimal',
        iconPosition: 'bottom-right'
      }
    };
  }

  async loadAuthToken() {
    try {
      const result = await chrome.storage.local.get(['auth_token', 'auth_expires']);
      if (result.auth_token && result.auth_expires > Date.now()) {
        this.authToken = result.auth_token;
      }
    } catch (error) {
      console.error('Failed to load auth token:', error);
    }
  }

  setupMessageListeners() {
    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender).then(sendResponse);
      return true; // Keep message channel open for async response
    });

    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.handleTabUpdate(tab);
      }
    });
  }

  async handleMessage(request, sender) {
    console.log('Background received message:', request.action);

    switch (request.action) {
      case 'conversationDetected':
        return await this.handleConversationDetected(request.data, sender);
      
      case 'executePrompt':
        return await this.handleExecutePrompt(request.data);
      
      case 'getRecommendations':
        return await this.handleGetRecommendations(request.data);
      
      case 'updateSettings':
        return await this.handleUpdateSettings(request.data);
      
      case 'authenticate':
        return await this.handleAuthentication();
      
      case 'getStatus':
        return await this.getExtensionStatus();
      
      default:
        console.warn('Unknown action:', request.action);
        return { success: false, error: 'Unknown action' };
    }
  }

  async handleConversationDetected(conversationData, sender) {
    try {
      // Validate conversation data
      if (!this.isValidConversation(conversationData)) {
        return { success: false, error: 'Invalid conversation data' };
      }

      // Assess value and filter
      const assessment = this.assessConversationValue(conversationData);
      if (!assessment.shouldSave) {
        return { success: true, message: 'Conversation filtered out', assessment };
      }

      // Sanitize sensitive data
      const sanitizedData = this.sanitizeConversation(conversationData);

      // Add metadata
      const enrichedData = {
        ...sanitizedData,
        platform: this.detectPlatform(sender.url),
        timestamp: new Date().toISOString(),
        tabId: sender.tab.id,
        url: sender.url,
        assessment: assessment
      };

      // Store locally first
      await this.storeConversationLocally(enrichedData);

      // Send to server if realtime is enabled
      if (this.settings.transmission.realtime && this.authToken) {
        await this.sendToServer(enrichedData);
      } else {
        this.pendingData.push(enrichedData);
      }

      // Show notification if enabled
      if (this.settings.ui.notificationLevel !== 'none') {
        this.showNotification('success', 'Conversation saved successfully');
      }

      return { success: true, assessment };

    } catch (error) {
      console.error('Error handling conversation:', error);
      return { success: false, error: error.message };
    }
  }

  isValidConversation(data) {
    if (!data || !data.prompt || !data.response) return false;
    if (data.prompt.length < this.settings.collection.minPromptLength) return false;
    if (data.response.length < this.settings.collection.minResponseLength) return false;
    return true;
  }

  assessConversationValue(conversation) {
    let score = 0;
    
    // Check complexity (0-30 points)
    const complexityKeywords = ['analyze', 'create', 'design', 'strategy', 'plan', 'optimize'];
    const complexityMatches = complexityKeywords.filter(keyword => 
      conversation.prompt.toLowerCase().includes(keyword)
    ).length;
    score += Math.min(complexityMatches * 10, 30);
    
    // Check professionality (0-30 points)
    const professionalKeywords = ['business', 'marketing', 'customer', 'sales', 'project', 'team'];
    const professionalMatches = professionalKeywords.filter(keyword => 
      conversation.prompt.toLowerCase().includes(keyword)
    ).length;
    score += Math.min(professionalMatches * 10, 30);
    
    // Check completeness (0-20 points)
    if (conversation.response.includes('具体的') || conversation.response.includes('detailed')) score += 10;
    if (conversation.response.length > 500) score += 10;
    
    // Check originality (0-20 points)
    // Simple originality check - in production, this would compare against existing data
    if (conversation.prompt.length > 200) score += 10;
    if (conversation.response.includes('手順') || conversation.response.includes('steps')) score += 10;

    return {
      shouldSave: score >= 50,
      score: score,
      category: this.categorizeConversation(conversation),
      priority: score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low'
    };
  }

  categorizeConversation(conversation) {
    const prompt = conversation.prompt.toLowerCase();
    
    if (prompt.includes('コード') || prompt.includes('code') || prompt.includes('プログラム')) {
      return 'programming';
    }
    if (prompt.includes('マーケティング') || prompt.includes('marketing') || prompt.includes('広告')) {
      return 'marketing';
    }
    if (prompt.includes('デザイン') || prompt.includes('design') || prompt.includes('UI')) {
      return 'design';
    }
    if (prompt.includes('分析') || prompt.includes('analysis') || prompt.includes('データ')) {
      return 'analysis';
    }
    if (prompt.includes('戦略') || prompt.includes('strategy') || prompt.includes('計画')) {
      return 'strategy';
    }
    
    return 'general';
  }

  sanitizeConversation(conversation) {
    const sensitivePatterns = {
      email: /[\w\.-]+@[\w\.-]+\.\w+/g,
      phone: /\d{3}-\d{4}-\d{4}/g,
      creditCard: /\d{4}-\d{4}-\d{4}-\d{4}/g,
      personalId: /\d{4}-\d{4}-\d{4}/g
    };

    let sanitized = JSON.parse(JSON.stringify(conversation));
    
    // Apply patterns to prompt and response
    for (const [type, pattern] of Object.entries(sensitivePatterns)) {
      sanitized.prompt = sanitized.prompt.replace(pattern, `[${type}]`);
      sanitized.response = sanitized.response.replace(pattern, `[${type}]`);
    }

    // Check for exclude patterns
    for (const excludePattern of this.settings.privacy.excludePatterns) {
      const regex = new RegExp(excludePattern, 'gi');
      sanitized.prompt = sanitized.prompt.replace(regex, '[FILTERED]');
      sanitized.response = sanitized.response.replace(regex, '[FILTERED]');
    }

    return sanitized;
  }

  detectPlatform(url) {
    if (!url) return 'unknown';
    if (url.includes('chat.openai.com')) return 'chatgpt';
    if (url.includes('claude.ai')) return 'claude';
    if (url.includes('copilot.microsoft.com')) return 'copilot';
    if (url.includes('bard.google.com')) return 'bard';
    return 'unknown';
  }

  async storeConversationLocally(data) {
    try {
      const stored = await chrome.storage.local.get(['conversations']);
      const conversations = stored.conversations || [];
      
      // Add new conversation
      conversations.push({
        id: this.generateId(),
        ...data
      });
      
      // Keep only last 100 conversations locally
      if (conversations.length > 100) {
        conversations.splice(0, conversations.length - 100);
      }
      
      await chrome.storage.local.set({ conversations });
    } catch (error) {
      console.error('Failed to store conversation locally:', error);
    }
  }

  async sendToServer(data) {
    if (!this.authToken) {
      throw new Error('No auth token available');
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          'X-Extension-Version': chrome.runtime.getManifest().version
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send to server:', error);
      // Add to pending data for retry
      this.pendingData.push(data);
      throw error;
    }
  }

  async handleExecutePrompt(data) {
    try {
      const { prompt, platform } = data;
      
      // Find or create tab for the platform
      const platformUrl = this.getPlatformUrl(platform);
      const tabs = await chrome.tabs.query({ url: platformUrl });
      
      let targetTab;
      if (tabs.length > 0) {
        targetTab = tabs[0];
        await chrome.tabs.update(targetTab.id, { active: true });
      } else {
        targetTab = await chrome.tabs.create({ url: platformUrl, active: true });
        // Wait for page to load
        await this.waitForTabLoad(targetTab.id);
      }

      // Execute prompt on the target tab
      await chrome.tabs.sendMessage(targetTab.id, {
        action: 'executePrompt',
        prompt: prompt
      });

      return { success: true, tabId: targetTab.id };
    } catch (error) {
      console.error('Failed to execute prompt:', error);
      return { success: false, error: error.message };
    }
  }

  getPlatformUrl(platform) {
    const urls = {
      chatgpt: 'https://chat.openai.com/',
      claude: 'https://claude.ai/',
      copilot: 'https://copilot.microsoft.com/',
      bard: 'https://bard.google.com/'
    };
    return urls[platform] || urls.chatgpt;
  }

  async waitForTabLoad(tabId) {
    return new Promise((resolve) => {
      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          // Give a bit more time for the page to be ready
          setTimeout(resolve, 2000);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  async handleGetRecommendations(data) {
    try {
      if (!this.authToken) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${this.apiEndpoint}/recommendations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: data.query.substring(0, 200),
          limit: 3
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const recommendations = await response.json();
      return { success: true, recommendations };
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return { success: false, error: error.message };
    }
  }

  async handleUpdateSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await chrome.storage.sync.set({ settings: this.settings });
      return { success: true };
    } catch (error) {
      console.error('Failed to update settings:', error);
      return { success: false, error: error.message };
    }
  }

  async handleAuthentication() {
    try {
      // Open authentication page
      const authTab = await chrome.tabs.create({
        url: `${this.apiEndpoint.replace('/llm-hub', '')}/auth/extension`,
        active: true
      });

      // Wait for authentication completion
      return new Promise((resolve) => {
        const checkAuth = setInterval(async () => {
          try {
            const tab = await chrome.tabs.get(authTab.id);
            if (tab.url.includes('/auth/success')) {
              // Extract token from URL or page
              const token = await this.extractTokenFromTab(authTab.id);
              if (token) {
                await this.storeAuthToken(token);
                clearInterval(checkAuth);
                chrome.tabs.remove(authTab.id);
                resolve({ success: true, token });
              }
            }
          } catch (error) {
            clearInterval(checkAuth);
            resolve({ success: false, error: error.message });
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkAuth);
          resolve({ success: false, error: 'Authentication timeout' });
        }, 300000);
      });
    } catch (error) {
      console.error('Authentication failed:', error);
      return { success: false, error: error.message };
    }
  }

  async extractTokenFromTab(tabId) {
    try {
      const results = await chrome.tabs.executeScript(tabId, {
        code: `
          // Try to extract token from page
          const tokenElement = document.querySelector('[data-token]');
          tokenElement ? tokenElement.getAttribute('data-token') : null;
        `
      });
      return results[0];
    } catch (error) {
      console.error('Failed to extract token:', error);
      return null;
    }
  }

  async storeAuthToken(token) {
    this.authToken = token;
    await chrome.storage.local.set({
      auth_token: token,
      auth_expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    });
  }

  async getExtensionStatus() {
    const stored = await chrome.storage.local.get(['conversations']);
    const conversations = stored.conversations || [];
    
    return {
      authenticated: !!this.authToken,
      conversationsStored: conversations.length,
      pendingSync: this.pendingData.length,
      settings: this.settings,
      version: chrome.runtime.getManifest().version
    };
  }

  startPeriodicSync() {
    // Sync pending data every X minutes
    setInterval(async () => {
      if (this.authToken && this.pendingData.length > 0) {
        console.log(`Syncing ${this.pendingData.length} pending conversations...`);
        
        const toSync = [...this.pendingData];
        this.pendingData = [];
        
        for (const data of toSync) {
          try {
            await this.sendToServer(data);
          } catch (error) {
            // Re-add to pending if failed
            this.pendingData.push(data);
          }
        }
      }
    }, this.settings.transmission.batchInterval * 60 * 1000);

    // Clean up old local data
    setInterval(async () => {
      const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
      const stored = await chrome.storage.local.get(['conversations']);
      const conversations = stored.conversations || [];
      
      const filtered = conversations.filter(conv => 
        new Date(conv.timestamp).getTime() > cutoff
      );
      
      if (filtered.length !== conversations.length) {
        await chrome.storage.local.set({ conversations: filtered });
        console.log(`Cleaned up ${conversations.length - filtered.length} old conversations`);
      }
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  showNotification(type, message) {
    if (this.settings.ui.notificationLevel === 'none') return;
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-48.png',
      title: 'LLM Knowledge Hub',
      message: message
    });
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  handleTabUpdate(tab) {
    // Could be used for additional tab-based logic
    // For now, just log platform detection
    if (tab && tab.url) {
      const platform = this.detectPlatform(tab.url);
      if (platform !== 'unknown') {
        console.log(`Detected LLM platform: ${platform} on tab ${tab.id}`);
      }
    }
  }
}

// Initialize the extension
const llmHub = new LLMKnowledgeHub();