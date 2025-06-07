// LLM Knowledge Hub Popup JavaScript

class PopupManager {
  constructor() {
    this.isAuthenticated = false;
    this.extensionStatus = null;
    this.refreshInterval = null;
    
    this.init();
  }

  async init() {
    console.log('Popup initializing...');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load initial data
    await this.loadExtensionStatus();
    
    // Start periodic refresh
    this.startPeriodicRefresh();
    
    console.log('Popup initialized');
  }

  setupEventListeners() {
    // Action buttons
    document.getElementById('openWebApp').addEventListener('click', () => {
      this.openWebApp();
    });

    document.getElementById('syncNow').addEventListener('click', () => {
      this.syncNow();
    });

    document.getElementById('authenticateBtn').addEventListener('click', () => {
      this.authenticate();
    });

    // Footer buttons
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.openSettings();
    });

    document.getElementById('helpBtn').addEventListener('click', () => {
      this.openHelp();
    });

    document.getElementById('feedbackBtn').addEventListener('click', () => {
      this.openFeedback();
    });

    // Platform status click handlers
    document.querySelectorAll('.platform-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const platform = e.currentTarget.dataset.platform;
        this.togglePlatform(platform);
      });
    });
  }

  async loadExtensionStatus() {
    this.showLoading(true);
    
    try {
      // Get status from background script
      const response = await chrome.runtime.sendMessage({ 
        action: 'getStatus' 
      });

      if (response) {
        this.extensionStatus = response;
        this.isAuthenticated = response.authenticated;
        this.updateUI();
      } else {
        this.showError('拡張機能との通信に失敗しました');
      }
    } catch (error) {
      console.error('Failed to load extension status:', error);
      this.showError('ステータス読み込みエラー');
    } finally {
      this.showLoading(false);
    }
  }

  updateUI() {
    if (!this.extensionStatus) return;

    // Update connection status
    this.updateConnectionStatus();
    
    // Update statistics
    this.updateStatistics();
    
    // Update platform status
    this.updatePlatformStatus();
    
    // Update recent activity
    this.updateRecentActivity();
    
    // Show/hide authentication section
    this.updateAuthenticationUI();
  }

  updateConnectionStatus() {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('.status-text');

    if (this.isAuthenticated) {
      statusDot.className = 'status-dot';
      statusText.textContent = '接続済み';
    } else {
      statusDot.className = 'status-dot connecting';
      statusText.textContent = '未認証';
    }
  }

  updateStatistics() {
    document.getElementById('conversationsCount').textContent = 
      this.extensionStatus.conversationsStored || '0';
    
    document.getElementById('pendingCount').textContent = 
      this.extensionStatus.pendingSync || '0';
    
    // Calculate today's count (simplified)
    document.getElementById('todayCount').textContent = 
      Math.min(this.extensionStatus.conversationsStored || 0, 5);
  }

  updatePlatformStatus() {
    const platforms = ['chatgpt', 'claude', 'copilot'];
    
    platforms.forEach(platform => {
      const statusElement = document.getElementById(`${platform}Status`);
      const isEnabled = this.extensionStatus.settings?.collection?.platforms?.[platform];
      
      if (statusElement) {
        statusElement.className = isEnabled ? 'status-badge enabled' : 'status-badge disabled';
        statusElement.textContent = isEnabled ? '有効' : '無効';
      }
    });
  }

  updateRecentActivity() {
    const activityList = document.getElementById('activityList');
    const noActivity = document.getElementById('noActivity');
    
    // For demo purposes, show some sample activity
    // In real implementation, this would load from stored conversations
    if (this.extensionStatus.conversationsStored > 0) {
      activityList.style.display = 'flex';
      noActivity.style.display = 'none';
      
      // Add sample activities (replace with real data)
      this.addSampleActivities();
    } else {
      activityList.style.display = 'none';
      noActivity.style.display = 'block';
    }
  }

  addSampleActivities() {
    const activityList = document.getElementById('activityList');
    const existingItems = activityList.querySelectorAll('.activity-item');
    
    // Remove existing items except the first (template)
    existingItems.forEach((item, index) => {
      if (index > 0) item.remove();
    });

    const sampleActivities = [
      {
        icon: '🤖',
        title: 'マーケティング戦略について相談',
        time: '5分前',
        platform: 'ChatGPT'
      },
      {
        icon: '🎭',
        title: 'コード生成と最適化',
        time: '1時間前',
        platform: 'Claude'
      },
      {
        icon: '👨‍✈️',
        title: 'プロジェクト計画の作成',
        time: '3時間前',
        platform: 'Copilot'
      }
    ];

    sampleActivities.forEach(activity => {
      const activityItem = document.createElement('div');
      activityItem.className = 'activity-item';
      activityItem.innerHTML = `
        <div class="activity-icon">${activity.icon}</div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-time">${activity.time} • ${activity.platform}</div>
        </div>
      `;
      activityList.appendChild(activityItem);
    });
  }

  updateAuthenticationUI() {
    const authSection = document.getElementById('authSection');
    
    if (!this.isAuthenticated) {
      authSection.style.display = 'block';
    } else {
      authSection.style.display = 'none';
    }
  }

  async openWebApp() {
    try {
      await chrome.tabs.create({
        url: 'https://your-company.com/llm-hub',
        active: true
      });
      window.close();
    } catch (error) {
      console.error('Failed to open web app:', error);
      this.showToast('Webアプリを開けませんでした', 'error');
    }
  }

  async syncNow() {
    const syncBtn = document.getElementById('syncNow');
    const originalText = syncBtn.innerHTML;
    
    syncBtn.innerHTML = '<span class="btn-icon">⏳</span>同期中...';
    syncBtn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'forcSync'
      });

      if (response && response.success) {
        this.showToast('同期が完了しました', 'success');
        await this.loadExtensionStatus(); // Refresh status
      } else {
        this.showToast('同期に失敗しました', 'error');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      this.showToast('同期エラーが発生しました', 'error');
    } finally {
      syncBtn.innerHTML = originalText;
      syncBtn.disabled = false;
    }
  }

  async authenticate() {
    const authBtn = document.getElementById('authenticateBtn');
    const originalText = authBtn.innerHTML;
    
    authBtn.innerHTML = '<span class="btn-icon">⏳</span>認証中...';
    authBtn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'authenticate'
      });

      if (response && response.success) {
        this.showToast('認証が完了しました', 'success');
        this.isAuthenticated = true;
        await this.loadExtensionStatus();
      } else {
        this.showToast('認証に失敗しました', 'error');
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      this.showToast('認証エラーが発生しました', 'error');
    } finally {
      authBtn.innerHTML = originalText;
      authBtn.disabled = false;
    }
  }

  async togglePlatform(platform) {
    try {
      const currentSettings = this.extensionStatus.settings;
      const isCurrentlyEnabled = currentSettings.collection.platforms[platform];
      
      // Toggle the platform setting
      const newSettings = {
        collection: {
          ...currentSettings.collection,
          platforms: {
            ...currentSettings.collection.platforms,
            [platform]: !isCurrentlyEnabled
          }
        }
      };

      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        data: newSettings
      });

      if (response && response.success) {
        this.showToast(
          `${platform.toUpperCase()}を${!isCurrentlyEnabled ? '有効' : '無効'}にしました`,
          'success'
        );
        await this.loadExtensionStatus();
      } else {
        this.showToast('設定の更新に失敗しました', 'error');
      }
    } catch (error) {
      console.error('Failed to toggle platform:', error);
      this.showToast('設定変更エラー', 'error');
    }
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  openHelp() {
    chrome.tabs.create({
      url: 'https://your-company.com/llm-hub/help',
      active: true
    });
    window.close();
  }

  openFeedback() {
    chrome.tabs.create({
      url: 'https://your-company.com/llm-hub/feedback',
      active: true
    });
    window.close();
  }

  showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = show ? 'flex' : 'none';
  }

  showError(message) {
    this.showToast(message, 'error');
    
    // Update status indicator
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    statusDot.className = 'status-dot error';
    statusText.textContent = 'エラー';
  }

  showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 3000);
  }

  startPeriodicRefresh() {
    // Refresh status every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadExtensionStatus();
    }, 30000);
  }

  stopPeriodicRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const popupManager = new PopupManager();
  
  // Clean up when popup is closed
  window.addEventListener('beforeunload', () => {
    popupManager.stopPeriodicRefresh();
  });
});

// Handle popup visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Refresh data when popup becomes visible
    setTimeout(() => {
      const popupManager = window.popupManager;
      if (popupManager) {
        popupManager.loadExtensionStatus();
      }
    }, 100);
  }
});