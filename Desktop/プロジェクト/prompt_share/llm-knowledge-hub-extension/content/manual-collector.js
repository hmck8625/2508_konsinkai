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
    if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) return 'chatgpt';
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
    console.log('🔍 ChatGPT: メッセージ取得開始');
    
    // 複数のセレクタを試行
    const selectors = [
      '[data-message-author-role]',
      '[data-testid^="conversation-turn-"]',
      '.group.w-full',
      '[class*="group"][class*="w-full"]',
      '.flex.flex-col.items-start',
      '[role="presentation"] > div'
    ];
    
    let messageElements = [];
    for (const selector of selectors) {
      messageElements = document.querySelectorAll(selector);
      if (messageElements.length > 0) {
        console.log(`✅ ChatGPT: セレクタ "${selector}" で ${messageElements.length}個の要素を発見`);
        break;
      } else {
        console.log(`❌ ChatGPT: セレクタ "${selector}" では要素が見つからない`);
      }
    }
    
    if (messageElements.length === 0) {
      console.warn('⚠️ ChatGPT: メッセージ要素が見つかりません');
      return [];
    }
    
    const messages = [];
    Array.from(messageElements).forEach((element, index) => {
      const role = this.determineChatGPTRole(element, index);
      const content = this.extractTextContent(element);
      
      if (content.length > 10) {
        console.log(`📝 ChatGPT Message ${index + 1}:`, {
          role,
          contentPreview: content.substring(0, 100) + '...',
          contentLength: content.length,
          element: element.tagName + (element.className ? '.' + element.className.split(' ').join('.') : '')
        });
        messages.push({ role, content, element, index });
      } else {
        console.log(`⏭️ ChatGPT: メッセージ${index + 1}をスキップ（短すぎる: ${content.length}文字）`);
      }
    });
    
    console.log(`📊 ChatGPT: 合計${messages.length}個のメッセージを取得`);
    return messages;
  }
  
  determineChatGPTRole(element, index) {
    // 1. data-message-author-role 属性をチェック
    const roleAttr = element.getAttribute('data-message-author-role');
    if (roleAttr) {
      console.log(`🏷️ ChatGPT: Role属性から判定 "${roleAttr}"`);
      return roleAttr;
    }
    
    // 2. テストID属性をチェック
    const testId = element.getAttribute('data-testid');
    if (testId && testId.includes('user')) {
      console.log('👤 ChatGPT: TestIDからユーザーと判定');
      return 'user';
    }
    if (testId && testId.includes('assistant')) {
      console.log('🤖 ChatGPT: TestIDからアシスタントと判定');
      return 'assistant';
    }
    
    // 3. アバター画像の存在をチェック
    const hasUserAvatar = element.querySelector('img[alt*="User"], img[alt*="user"], .avatar-user');
    const hasAssistantAvatar = element.querySelector('img[alt*="ChatGPT"], img[alt*="Assistant"], .avatar-assistant, img[src*="chatgpt"]');
    
    if (hasUserAvatar) {
      console.log('👤 ChatGPT: アバターからユーザーと判定');
      return 'user';
    }
    if (hasAssistantAvatar) {
      console.log('🤖 ChatGPT: アバターからアシスタントと判定');
      return 'assistant';
    }
    
    // 4. CSSクラス名をチェック
    const className = element.className.toLowerCase();
    if (className.includes('user') || className.includes('human')) {
      console.log('👤 ChatGPT: クラス名からユーザーと判定');
      return 'user';
    }
    if (className.includes('assistant') || className.includes('bot') || className.includes('ai')) {
      console.log('🤖 ChatGPT: クラス名からアシスタントと判定');
      return 'assistant';
    }
    
    // 5. 背景色や位置による判定
    const computedStyle = window.getComputedStyle(element);
    const bgColor = computedStyle.backgroundColor;
    const marginLeft = computedStyle.marginLeft;
    
    // ChatGPTでは通常、ユーザーメッセージは右寄せまたは特定の背景色
    if (marginLeft && parseInt(marginLeft) > 0) {
      console.log('👤 ChatGPT: マージンからユーザーと判定');
      return 'user';
    }
    
    // 6. フォールバック: インデックスベース（奇数=user, 偶数=assistant）
    const role = index % 2 === 0 ? 'user' : 'assistant';
    console.log(`🔄 ChatGPT: インデックス${index}からフォールバック判定 "${role}"`);
    return role;
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
    console.log('🔄 会話データ抽出開始');
    console.log(`📊 全メッセージ数: ${messages.length}`);
    
    if (messages.length < 2) {
      console.warn('⚠️ メッセージ数が不足（2未満）');
      return null;
    }

    // メッセージを詳細にログ出力
    messages.forEach((msg, index) => {
      console.log(`Message ${index + 1}: [${msg.role}] ${msg.content.substring(0, 50)}...`);
    });

    // Get last user message and last assistant message
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    console.log(`👤 ユーザーメッセージ数: ${userMessages.length}`);
    console.log(`🤖 アシスタントメッセージ数: ${assistantMessages.length}`);

    if (userMessages.length === 0 || assistantMessages.length === 0) {
      console.error('❌ ユーザーまたはアシスタントのメッセージが見つかりません');
      return null;
    }

    const lastUserMessage = userMessages[userMessages.length - 1];
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];

    // 重複チェック
    if (lastUserMessage.content === lastAssistantMessage.content) {
      console.error('❌ プロンプトと応答が同じ内容です。ロール判定に問題があります。');
      console.log('🔍 デバッグ情報:');
      console.log('Last User:', lastUserMessage);
      console.log('Last Assistant:', lastAssistantMessage);
      
      // より詳細な分析を試行
      return this.fallbackConversationExtraction(messages);
    }

    const result = {
      prompt: lastUserMessage.content,
      response: lastAssistantMessage.content,
      conversationLength: messages.length,
      estimatedTokens: this.estimateTokens(lastUserMessage.content + lastAssistantMessage.content),
      fullConversation: messages.map(m => ({ role: m.role, content: m.content, index: m.index })),
      debugInfo: {
        userMessagesCount: userMessages.length,
        assistantMessagesCount: assistantMessages.length,
        totalMessages: messages.length,
        lastUserIndex: lastUserMessage.index,
        lastAssistantIndex: lastAssistantMessage.index
      }
    };

    console.log('✅ 会話データ抽出完了:');
    console.log('📝 プロンプト:', result.prompt.substring(0, 100) + '...');
    console.log('🤖 応答:', result.response.substring(0, 100) + '...');
    
    return result;
  }

  fallbackConversationExtraction(messages) {
    console.log('🔄 フォールバック抽出を実行');
    
    // メッセージの順序を再検討
    const sortedMessages = messages.sort((a, b) => (a.index || 0) - (b.index || 0));
    
    // 最後の2つのメッセージを取得し、強制的に異なるロールを割り当て
    if (sortedMessages.length >= 2) {
      const secondLast = sortedMessages[sortedMessages.length - 2];
      const last = sortedMessages[sortedMessages.length - 1];
      
      // 内容が異なる場合のみ使用
      if (secondLast.content !== last.content) {
        return {
          prompt: secondLast.content,
          response: last.content,
          conversationLength: messages.length,
          estimatedTokens: this.estimateTokens(secondLast.content + last.content),
          fullConversation: messages.map(m => ({ role: m.role, content: m.content, index: m.index })),
          debugInfo: {
            extractionMethod: 'fallback',
            usedSecondLast: true,
            secondLastRole: secondLast.role,
            lastRole: last.role
          }
        };
      }
    }
    
    console.error('❌ フォールバック抽出も失敗');
    return null;
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
    
    const debugInfo = data.debugInfo ? `
      <div class="toast-debug">
        <strong>🔍 デバッグ情報:</strong><br>
        ユーザーメッセージ: ${data.debugInfo.userMessagesCount || 0}個<br>
        アシスタントメッセージ: ${data.debugInfo.assistantMessagesCount || 0}個<br>
        ${data.debugInfo.extractionMethod ? `抽出方法: ${data.debugInfo.extractionMethod}<br>` : ''}
      </div>
    ` : '';
    
    toast.innerHTML = `
      <div class="toast-header">
        <span class="toast-title">📊 収集完了</span>
        <button class="toast-close">×</button>
      </div>
      <div class="toast-content">
        <div class="toast-meta">
          ${this.getPlatformName(this.detectCurrentPlatform())} • ${data.conversationLength || 2}往復
        </div>
        ${debugInfo}
        <div class="toast-preview">
          <strong>プロンプト (${data.prompt?.length || 0}文字):</strong><br>
          ${this.truncateText(data.prompt, 150)}<br><br>
          <strong>応答 (${data.response?.length || 0}文字):</strong><br>
          ${this.truncateText(data.response, 150)}
        </div>
        <div class="toast-actions">
          <button class="toast-btn" id="viewFullToast">詳細を表示</button>
          <button class="toast-btn" id="copyToast">コピー</button>
          <button class="toast-btn" id="debugToast">デバッグ情報</button>
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

    toast.querySelector('#debugToast').addEventListener('click', () => {
      toast.remove();
      this.showDebugInfo(data);
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

  showDebugInfo(data) {
    const debug = document.createElement('div');
    debug.className = 'llm-hub-debug-modal';
    debug.innerHTML = `
      <div class="details-overlay">
        <div class="details-content">
          <div class="details-header">
            <h3>🔍 デバッグ情報</h3>
            <button class="details-close">×</button>
          </div>
          <div class="details-body">
            <div class="debug-section">
              <h4>📊 基本情報</h4>
              <div class="debug-info">
                <p><strong>プラットフォーム:</strong> ${this.getPlatformName(this.detectCurrentPlatform())}</p>
                <p><strong>URL:</strong> ${window.location.href}</p>
                <p><strong>収集時刻:</strong> ${data.timestamp || '不明'}</p>
                <p><strong>会話長:</strong> ${data.conversationLength || 0}メッセージ</p>
                <p><strong>推定トークン:</strong> ${data.estimatedTokens || 0}</p>
              </div>
            </div>
            
            ${data.debugInfo ? `
              <div class="debug-section">
                <h4>🔍 抽出情報</h4>
                <div class="debug-info">
                  <p><strong>ユーザーメッセージ数:</strong> ${data.debugInfo.userMessagesCount || 0}</p>
                  <p><strong>アシスタントメッセージ数:</strong> ${data.debugInfo.assistantMessagesCount || 0}</p>
                  <p><strong>総メッセージ数:</strong> ${data.debugInfo.totalMessages || 0}</p>
                  ${data.debugInfo.extractionMethod ? `<p><strong>抽出方法:</strong> ${data.debugInfo.extractionMethod}</p>` : ''}
                  ${data.debugInfo.lastUserIndex !== undefined ? `<p><strong>最後のユーザーメッセージ位置:</strong> ${data.debugInfo.lastUserIndex}</p>` : ''}
                  ${data.debugInfo.lastAssistantIndex !== undefined ? `<p><strong>最後のアシスタントメッセージ位置:</strong> ${data.debugInfo.lastAssistantIndex}</p>` : ''}
                </div>
              </div>
            ` : ''}
            
            <div class="debug-section">
              <h4>💬 完全な会話履歴</h4>
              <div class="debug-conversation">
                ${data.fullConversation ? data.fullConversation.map((msg, index) => `
                  <div class="debug-message ${msg.role}">
                    <div class="debug-message-header">
                      <span><strong>${index + 1}. ${msg.role === 'user' ? '👤 ユーザー' : '🤖 アシスタント'}</strong></span>
                      ${msg.index !== undefined ? `<span class="debug-index">要素位置: ${msg.index}</span>` : ''}
                    </div>
                    <div class="debug-message-content">${this.escapeHtml(msg.content)}</div>
                  </div>
                `).join('') : '<p>会話履歴がありません</p>'}
              </div>
            </div>
          </div>
          <div class="details-footer">
            <button class="details-btn" id="copyDebug">📋 デバッグ情報をコピー</button>
            <button class="details-btn" id="closeDebug">閉じる</button>
          </div>
        </div>
      </div>
    `;

    debug.style.cssText = `
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

    document.body.appendChild(debug);

    // Event listeners
    const closeModal = () => debug.remove();
    debug.querySelector('.details-close').addEventListener('click', closeModal);
    debug.querySelector('#closeDebug').addEventListener('click', closeModal);
    debug.querySelector('.details-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    debug.querySelector('#copyDebug').addEventListener('click', async () => {
      const debugText = this.generateDebugText(data);
      try {
        await navigator.clipboard.writeText(debugText);
        this.showMessage('デバッグ情報をコピーしました', 'success');
      } catch (err) {
        console.error('Copy failed:', err);
      }
    });
  }

  generateDebugText(data) {
    let text = `=== LLM Knowledge Hub デバッグ情報 ===\n\n`;
    text += `プラットフォーム: ${this.getPlatformName(this.detectCurrentPlatform())}\n`;
    text += `URL: ${window.location.href}\n`;
    text += `収集時刻: ${data.timestamp || '不明'}\n`;
    text += `会話長: ${data.conversationLength || 0}メッセージ\n`;
    text += `推定トークン: ${data.estimatedTokens || 0}\n\n`;
    
    if (data.debugInfo) {
      text += `=== 抽出情報 ===\n`;
      text += `ユーザーメッセージ数: ${data.debugInfo.userMessagesCount || 0}\n`;
      text += `アシスタントメッセージ数: ${data.debugInfo.assistantMessagesCount || 0}\n`;
      text += `総メッセージ数: ${data.debugInfo.totalMessages || 0}\n`;
      if (data.debugInfo.extractionMethod) {
        text += `抽出方法: ${data.debugInfo.extractionMethod}\n`;
      }
      text += `\n`;
    }
    
    text += `=== 抽出されたプロンプト ===\n${data.prompt}\n\n`;
    text += `=== 抽出された応答 ===\n${data.response}\n\n`;
    
    if (data.fullConversation) {
      text += `=== 完全な会話履歴 ===\n`;
      data.fullConversation.forEach((msg, index) => {
        text += `${index + 1}. [${msg.role}] ${msg.content}\n\n`;
      });
    }
    
    return text;
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

  .toast-debug {
    font-size: 11px;
    color: #666;
    background: #f8f9fa;
    padding: 8px;
    border-radius: 4px;
    margin-bottom: 12px;
    border: 1px solid #e0e0e0;
  }

  .debug-section {
    margin-bottom: 20px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
  }

  .debug-section h4 {
    margin: 0;
    padding: 12px 16px;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
    font-size: 14px;
    font-weight: 600;
  }

  .debug-info {
    padding: 16px;
  }

  .debug-info p {
    margin: 4px 0;
    font-size: 13px;
  }

  .debug-conversation {
    max-height: 300px;
    overflow-y: auto;
    padding: 0;
  }

  .debug-message {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  .debug-message:last-child {
    border-bottom: none;
  }

  .debug-message.user {
    background: #f0f8ff;
  }

  .debug-message.assistant {
    background: #faf5ff;
  }

  .debug-message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 12px;
  }

  .debug-index {
    color: #666;
    font-size: 11px;
  }

  .debug-message-content {
    font-size: 13px;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
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