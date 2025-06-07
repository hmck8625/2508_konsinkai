// Preview Modal for collected conversations
class PreviewModal {
  constructor() {
    this.modal = null;
    this.isVisible = false;
  }

  show(conversationData) {
    this.hide(); // Remove any existing modal
    this.createModal(conversationData);
    this.showModal();
  }

  createModal(data) {
    this.modal = document.createElement('div');
    this.modal.className = 'llm-hub-preview-modal';
    this.modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h2>📊 収集内容プレビュー</h2>
            <button class="close-btn" aria-label="閉じる">×</button>
          </div>
          
          <div class="modal-body">
            <div class="conversation-meta">
              <div class="meta-item">
                <span class="meta-label">プラットフォーム:</span>
                <span class="meta-value platform-${data.platform}">${this.getPlatformName(data.platform)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">収集時刻:</span>
                <span class="meta-value">${this.formatDate(data.timestamp)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">会話長:</span>
                <span class="meta-value">${data.conversationLength || 2}往復</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">推定トークン:</span>
                <span class="meta-value">${data.estimatedTokens || 0}トークン</span>
              </div>
            </div>

            <div class="conversation-content">
              <div class="message-block user-message">
                <div class="message-header">
                  <span class="message-role">👤 ユーザー</span>
                  <span class="message-length">${data.prompt?.length || 0}文字</span>
                </div>
                <div class="message-content">
                  ${this.escapeHtml(this.truncateText(data.prompt || 'プロンプトが見つかりません', 500))}
                </div>
              </div>

              <div class="message-block assistant-message">
                <div class="message-header">
                  <span class="message-role">🤖 ${this.getPlatformName(data.platform)}</span>
                  <span class="message-length">${data.response?.length || 0}文字</span>
                </div>
                <div class="message-content">
                  ${this.escapeHtml(this.truncateText(data.response || '応答が見つかりません', 800))}
                </div>
              </div>
            </div>

            ${this.createFullConversationSection(data)}
            ${this.createActionsSection(data)}
          </div>

          <div class="modal-footer">
            <button class="btn secondary" id="editBtn">
              <span class="btn-icon">✏️</span>
              編集
            </button>
            <button class="btn secondary" id="copyBtn">
              <span class="btn-icon">📋</span>
              コピー
            </button>
            <button class="btn primary" id="shareBtn">
              <span class="btn-icon">🔗</span>
              Webアプリで開く
            </button>
          </div>
        </div>
      </div>
    `;

    this.addModalStyles();
    this.setupEventListeners(data);
    document.body.appendChild(this.modal);
  }

  createFullConversationSection(data) {
    if (!data.fullConversation || data.fullConversation.length <= 2) {
      return '';
    }

    const conversationHtml = data.fullConversation.map((msg, index) => `
      <div class="full-message ${msg.role}">
        <div class="full-message-header">
          <span class="message-role">${msg.role === 'user' ? '👤 ユーザー' : '🤖 アシスタント'}</span>
          <span class="message-index">#${index + 1}</span>
        </div>
        <div class="full-message-content">
          ${this.escapeHtml(this.truncateText(msg.content, 300))}
        </div>
      </div>
    `).join('');

    return `
      <div class="full-conversation-section">
        <div class="section-toggle" id="toggleFullConversation">
          <span class="toggle-icon">▼</span>
          <span class="toggle-text">完全な会話を表示 (${data.fullConversation.length}メッセージ)</span>
        </div>
        <div class="full-conversation-content" style="display: none;">
          ${conversationHtml}
        </div>
      </div>
    `;
  }

  createActionsSection(data) {
    return `
      <div class="actions-section">
        <div class="section-header">
          <span class="section-icon">⚡</span>
          <span class="section-title">クイックアクション</span>
        </div>
        <div class="quick-actions">
          <button class="quick-action-btn" id="rerunBtn">
            <span class="action-icon">🔄</span>
            <span class="action-text">同じプロンプトを再実行</span>
          </button>
          <button class="quick-action-btn" id="improveBtn">
            <span class="action-icon">✨</span>
            <span class="action-text">プロンプトを改善</span>
          </button>
          <button class="quick-action-btn" id="templateBtn">
            <span class="action-icon">📝</span>
            <span class="action-text">テンプレート化</span>
          </button>
        </div>
      </div>
    `;
  }

  setupEventListeners(data) {
    // Close button
    this.modal.querySelector('.close-btn').addEventListener('click', () => {
      this.hide();
    });

    // Click outside to close
    this.modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hide();
      }
    });

    // ESC key to close
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Full conversation toggle
    const toggleBtn = this.modal.querySelector('#toggleFullConversation');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleFullConversation();
      });
    }

    // Footer buttons
    this.modal.querySelector('#editBtn').addEventListener('click', () => {
      this.editConversation(data);
    });

    this.modal.querySelector('#copyBtn').addEventListener('click', () => {
      this.copyToClipboard(data);
    });

    this.modal.querySelector('#shareBtn').addEventListener('click', () => {
      this.openInWebApp(data);
    });

    // Quick action buttons
    const rerunBtn = this.modal.querySelector('#rerunBtn');
    if (rerunBtn) {
      rerunBtn.addEventListener('click', () => {
        this.rerunPrompt(data.prompt);
      });
    }

    const improveBtn = this.modal.querySelector('#improveBtn');
    if (improveBtn) {
      improveBtn.addEventListener('click', () => {
        this.improvePrompt(data.prompt);
      });
    }

    const templateBtn = this.modal.querySelector('#templateBtn');
    if (templateBtn) {
      templateBtn.addEventListener('click', () => {
        this.createTemplate(data);
      });
    }
  }

  showModal() {
    this.isVisible = true;
    // Trigger animation
    setTimeout(() => {
      this.modal.classList.add('show');
    }, 10);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  hide() {
    if (!this.modal || !this.isVisible) return;

    this.isVisible = false;
    this.modal.classList.remove('show');
    
    setTimeout(() => {
      if (this.modal && this.modal.parentNode) {
        this.modal.parentNode.removeChild(this.modal);
      }
      this.modal = null;
      document.body.style.overflow = '';
    }, 300);

    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleKeyDown(e) {
    if (e.key === 'Escape' && this.isVisible) {
      this.hide();
    }
  }

  toggleFullConversation() {
    const content = this.modal.querySelector('.full-conversation-content');
    const toggle = this.modal.querySelector('#toggleFullConversation');
    const icon = toggle.querySelector('.toggle-icon');
    
    if (content.style.display === 'none') {
      content.style.display = 'block';
      icon.textContent = '▲';
      toggle.querySelector('.toggle-text').textContent = '完全な会話を隠す';
    } else {
      content.style.display = 'none';
      icon.textContent = '▼';
      toggle.querySelector('.toggle-text').textContent = 
        `完全な会話を表示 (${this.modal.querySelectorAll('.full-message').length}メッセージ)`;
    }
  }

  async editConversation(data) {
    // Create simple edit interface
    const editModal = document.createElement('div');
    editModal.className = 'llm-hub-edit-modal';
    editModal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content edit-content">
          <div class="modal-header">
            <h2>✏️ 収集内容を編集</h2>
            <button class="close-btn">×</button>
          </div>
          <div class="modal-body">
            <div class="edit-field">
              <label>プロンプト:</label>
              <textarea id="editPrompt" rows="4">${data.prompt || ''}</textarea>
            </div>
            <div class="edit-field">
              <label>応答:</label>
              <textarea id="editResponse" rows="6">${data.response || ''}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn secondary" id="cancelEdit">キャンセル</button>
            <button class="btn primary" id="saveEdit">保存</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(editModal);
    editModal.classList.add('show');

    // Event listeners for edit modal
    editModal.querySelector('.close-btn').addEventListener('click', () => {
      editModal.remove();
    });

    editModal.querySelector('#cancelEdit').addEventListener('click', () => {
      editModal.remove();
    });

    editModal.querySelector('#saveEdit').addEventListener('click', () => {
      const newPrompt = editModal.querySelector('#editPrompt').value;
      const newResponse = editModal.querySelector('#editResponse').value;
      
      // Update the data and refresh main modal
      data.prompt = newPrompt;
      data.response = newResponse;
      
      editModal.remove();
      this.show(data); // Refresh with updated data
      
      this.showToast('編集内容を保存しました', 'success');
    });
  }

  async copyToClipboard(data) {
    const text = `プロンプト:\n${data.prompt}\n\n応答:\n${data.response}`;
    
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('クリップボードにコピーしました', 'success');
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showToast('クリップボードにコピーしました', 'success');
    }
  }

  async openInWebApp(data) {
    // Generate a unique ID for the conversation
    const conversationId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const webAppUrl = `https://your-company.com/llm-hub/conversation/${conversationId}`;
    
    // Open in new tab
    window.open(webAppUrl, '_blank');
    this.showToast('Webアプリで開きました', 'info');
  }

  async rerunPrompt(prompt) {
    // Get current platform input element
    const platform = this.detectCurrentPlatform();
    const inputElement = this.getInputElementForPlatform(platform);
    
    if (inputElement) {
      inputElement.value = prompt;
      inputElement.focus();
      
      // Trigger input events
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      this.hide();
      this.showToast('プロンプトを入力欄に設定しました', 'success');
    } else {
      this.showToast('入力欄が見つかりません', 'error');
    }
  }

  async improvePrompt(prompt) {
    const improvedPrompt = `以下のプロンプトをより効果的に改善してください：

${prompt}

改善ポイント:
- より具体的で明確な指示
- 期待する出力形式の明示
- 必要な背景情報の追加`;

    this.rerunPrompt(improvedPrompt);
  }

  async createTemplate(data) {
    // Simple template creation
    const template = `# ${this.getPlatformName(data.platform)} プロンプトテンプレート

## プロンプト
${data.prompt}

## 期待される応答の例
${data.response.substring(0, 200)}...

## 使用場面
[この欄に使用場面を記述]

## 注意点
[特別な注意点があれば記述]`;

    await this.copyToClipboard({ prompt: template, response: '' });
    this.showToast('テンプレートをクリップボードにコピーしました', 'success');
  }

  detectCurrentPlatform() {
    const url = window.location.href;
    if (url.includes('chat.openai.com')) return 'chatgpt';
    if (url.includes('claude.ai')) return 'claude';
    if (url.includes('copilot.microsoft.com')) return 'copilot';
    if (url.includes('bard.google.com')) return 'bard';
    return 'unknown';
  }

  getInputElementForPlatform(platform) {
    switch (platform) {
      case 'chatgpt':
        return document.querySelector('#prompt-textarea');
      case 'claude':
        return document.querySelector('div[contenteditable="true"]');
      case 'copilot':
        return document.querySelector('#userInput, .as-input, textarea[placeholder*="Ask"]');
      default:
        return null;
    }
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

  formatDate(timestamp) {
    if (!timestamp) return '不明';
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
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

  showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = 'llm-hub-toast';
    toast.innerHTML = `
      <span class="toast-icon">${this.getToastIcon(type)}</span>
      <span class="toast-message">${message}</span>
    `;
    
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 20001;
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
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutToast 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  getToastIcon(type) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    return icons[type] || icons.info;
  }

  getToastColor(type) {
    const colors = { success: '#4caf50', error: '#f44336', warning: '#ff9800', info: '#2196f3' };
    return colors[type] || colors.info;
  }

  addModalStyles() {
    if (document.querySelector('#llm-hub-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'llm-hub-modal-styles';
    style.textContent = `
      .llm-hub-preview-modal, .llm-hub-edit-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 20000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }

      .llm-hub-preview-modal.show, .llm-hub-edit-modal.show {
        opacity: 1;
        visibility: visible;
      }

      .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .modal-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 800px;
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transform: translateY(20px) scale(0.95);
        transition: transform 0.3s ease;
      }

      .llm-hub-preview-modal.show .modal-content, .llm-hub-edit-modal.show .modal-content {
        transform: translateY(0) scale(1);
      }

      .modal-header {
        padding: 20px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      }

      .modal-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
      }

      .close-btn:hover {
        background: #f0f0f0;
      }

      .modal-body {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }

      .conversation-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-bottom: 20px;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;
      }

      .meta-item {
        display: flex;
        gap: 8px;
      }

      .meta-label {
        font-weight: 600;
        color: #555;
        min-width: 80px;
      }

      .meta-value {
        color: #333;
      }

      .platform-chatgpt { color: #10a37f; }
      .platform-claude { color: #c55a11; }
      .platform-copilot { color: #0078d4; }
      .platform-bard { color: #4285f4; }

      .conversation-content {
        margin-bottom: 24px;
      }

      .message-block {
        margin-bottom: 16px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e0e0e0;
      }

      .message-header {
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        font-size: 14px;
      }

      .user-message .message-header {
        background: #e3f2fd;
        color: #1565c0;
      }

      .assistant-message .message-header {
        background: #f3e5f5;
        color: #7b1fa2;
      }

      .message-content {
        padding: 16px;
        line-height: 1.6;
        white-space: pre-wrap;
        font-size: 14px;
        color: #333;
      }

      .message-length {
        font-size: 12px;
        opacity: 0.7;
        font-weight: normal;
      }

      .full-conversation-section {
        margin-bottom: 24px;
      }

      .section-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .section-toggle:hover {
        background: #e9ecef;
      }

      .toggle-icon {
        font-size: 12px;
        transition: transform 0.2s;
      }

      .full-conversation-content {
        margin-top: 12px;
      }

      .full-message {
        margin-bottom: 12px;
        padding: 12px;
        border-radius: 6px;
        border: 1px solid #e0e0e0;
      }

      .full-message.user {
        background: #f0f8ff;
      }

      .full-message.assistant {
        background: #faf5ff;
      }

      .full-message-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 600;
      }

      .full-message-content {
        font-size: 13px;
        line-height: 1.5;
        color: #444;
      }

      .actions-section {
        margin-bottom: 20px;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        font-weight: 600;
        color: #333;
      }

      .quick-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
      }

      .quick-action-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: #f8f9fa;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 13px;
      }

      .quick-action-btn:hover {
        background: #e9ecef;
        border-color: #ced4da;
        transform: translateY(-1px);
      }

      .modal-footer {
        padding: 20px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        background: #f8f9fa;
      }

      .btn {
        padding: 10px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
      }

      .btn.primary {
        background: #4285f4;
        color: white;
      }

      .btn.primary:hover {
        background: #3367d6;
        transform: translateY(-1px);
      }

      .btn.secondary {
        background: #f8f9fa;
        color: #555;
        border: 1px solid #e0e0e0;
      }

      .btn.secondary:hover {
        background: #e9ecef;
      }

      .edit-content {
        max-width: 600px;
      }

      .edit-field {
        margin-bottom: 16px;
      }

      .edit-field label {
        display: block;
        margin-bottom: 6px;
        font-weight: 600;
        color: #333;
      }

      .edit-field textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
        resize: vertical;
        min-height: 80px;
      }

      .edit-field textarea:focus {
        outline: none;
        border-color: #4285f4;
        box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
      }

      @media (max-width: 768px) {
        .modal-overlay {
          padding: 10px;
        }

        .conversation-meta {
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .quick-actions {
          grid-template-columns: 1fr;
        }

        .modal-footer {
          flex-direction: column;
        }

        .btn {
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Export for use in other files
window.PreviewModal = PreviewModal;