// LLM Knowledge Hub Options Page JavaScript

class OptionsManager {
  constructor() {
    this.defaultSettings = {
      collection: {
        enabled: true,
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
      },
      advanced: {
        apiEndpoint: 'https://api.your-company.com/llm-hub',
        debugMode: false
      }
    };
    
    this.currentSettings = {};
    this.hasUnsavedChanges = false;
    
    this.init();
  }

  async init() {
    console.log('Options page initializing...');
    
    // Load current settings
    await this.loadSettings();
    
    // Populate UI with current settings
    this.populateUI();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set up auto-save indication
    this.setupChangeDetection();
    
    console.log('Options page initialized');
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['settings']);
      this.currentSettings = result.settings || this.defaultSettings;
      console.log('Loaded settings:', this.currentSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.currentSettings = this.defaultSettings;
      this.showStatus('設定の読み込みに失敗しました', 'error');
    }
  }

  populateUI() {
    // Collection settings
    document.getElementById('collectionEnabled').checked = 
      this.currentSettings.collection.enabled;
    document.getElementById('collectionMode').value = 
      this.currentSettings.collection.mode || 'manual';
    
    // Platform settings
    const platforms = ['chatgpt', 'claude', 'copilot', 'bard'];
    platforms.forEach(platform => {
      const element = document.getElementById(`${platform}Enabled`);
      if (element) {
        element.checked = this.currentSettings.collection.platforms[platform];
      }
    });
    
    document.getElementById('minPromptLength').value = 
      this.currentSettings.collection.minPromptLength;
    document.getElementById('minResponseLength').value = 
      this.currentSettings.collection.minResponseLength;
    
    // Transmission settings
    document.getElementById('realtimeEnabled').checked = 
      this.currentSettings.transmission.realtime;
    document.getElementById('batchInterval').value = 
      this.currentSettings.transmission.batchInterval;
    document.getElementById('offlineEnabled').checked = 
      this.currentSettings.transmission.offline;
    
    // Privacy settings
    document.getElementById('autoMaskEnabled').checked = 
      this.currentSettings.privacy.autoMask;
    document.getElementById('excludePatterns').value = 
      this.currentSettings.privacy.excludePatterns.join('\n');
    document.getElementById('manualApprovalEnabled').checked = 
      this.currentSettings.privacy.manualApproval;
    
    // UI settings
    document.getElementById('showRecommendations').checked = 
      this.currentSettings.ui.showRecommendations;
    document.getElementById('notificationLevel').value = 
      this.currentSettings.ui.notificationLevel;
    document.getElementById('iconPosition').value = 
      this.currentSettings.ui.iconPosition;
    
    // Advanced settings
    document.getElementById('apiEndpoint').value = 
      this.currentSettings.advanced.apiEndpoint;
    document.getElementById('debugMode').checked = 
      this.currentSettings.advanced.debugMode;
  }

  setupEventListeners() {
    // Save button
    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveSettings();
    });
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
      this.resetToDefaults();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveSettings();
      }
    });
    
    // Handle browser refresh/close with unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  setupChangeDetection() {
    const inputs = document.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        this.markAsChanged();
      });
      
      // Also listen for input events on text inputs
      if (input.type === 'text' || input.type === 'number' || input.type === 'url' || input.tagName === 'TEXTAREA') {
        input.addEventListener('input', () => {
          this.markAsChanged();
        });
      }
    });
  }

  markAsChanged() {
    this.hasUnsavedChanges = true;
    
    // Update save button state
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.innerHTML = '<span class="btn-icon">💾</span>設定を保存 *';
    saveBtn.style.background = '#ff9800';
  }

  async saveSettings() {
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.innerHTML;
    
    saveBtn.innerHTML = '<span class="btn-icon">⏳</span>保存中...';
    saveBtn.disabled = true;

    try {
      // Collect settings from UI
      const newSettings = this.collectSettingsFromUI();
      
      // Validate settings
      const validation = this.validateSettings(newSettings);
      if (!validation.valid) {
        this.showStatus(validation.message, 'error');
        return;
      }
      
      // Save to storage
      await chrome.storage.sync.set({ settings: newSettings });
      
      // Update background script
      await chrome.runtime.sendMessage({
        action: 'updateSettings',
        data: newSettings
      });
      
      this.currentSettings = newSettings;
      this.hasUnsavedChanges = false;
      
      // Update UI state
      saveBtn.innerHTML = '<span class="btn-icon">✅</span>保存完了';
      saveBtn.style.background = '#4caf50';
      
      this.showStatus('設定が保存されました', 'success');
      
      console.log('Settings saved:', newSettings);
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showStatus('設定の保存に失敗しました', 'error');
    } finally {
      // Reset button after 2 seconds
      setTimeout(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.style.background = '';
        saveBtn.disabled = false;
      }, 2000);
    }
  }

  collectSettingsFromUI() {
    // Parse exclude patterns
    const excludePatternsText = document.getElementById('excludePatterns').value;
    const excludePatterns = excludePatternsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    return {
      collection: {
        enabled: document.getElementById('collectionEnabled').checked,
        mode: document.getElementById('collectionMode').value,
        platforms: {
          chatgpt: document.getElementById('chatgptEnabled').checked,
          claude: document.getElementById('claudeEnabled').checked,
          copilot: document.getElementById('copilotEnabled').checked,
          bard: document.getElementById('bardEnabled').checked
        },
        minPromptLength: parseInt(document.getElementById('minPromptLength').value),
        minResponseLength: parseInt(document.getElementById('minResponseLength').value)
      },
      transmission: {
        realtime: document.getElementById('realtimeEnabled').checked,
        batchInterval: parseInt(document.getElementById('batchInterval').value),
        offline: document.getElementById('offlineEnabled').checked
      },
      privacy: {
        autoMask: document.getElementById('autoMaskEnabled').checked,
        excludePatterns: excludePatterns,
        manualApproval: document.getElementById('manualApprovalEnabled').checked
      },
      ui: {
        showRecommendations: document.getElementById('showRecommendations').checked,
        notificationLevel: document.getElementById('notificationLevel').value,
        iconPosition: document.getElementById('iconPosition').value
      },
      advanced: {
        apiEndpoint: document.getElementById('apiEndpoint').value.trim(),
        debugMode: document.getElementById('debugMode').checked
      }
    };
  }

  validateSettings(settings) {
    // Validate numeric ranges
    if (settings.collection.minPromptLength < 10 || settings.collection.minPromptLength > 500) {
      return {
        valid: false,
        message: '最小プロンプト長は10-500文字の範囲で設定してください'
      };
    }
    
    if (settings.collection.minResponseLength < 50 || settings.collection.minResponseLength > 1000) {
      return {
        valid: false,
        message: '最小応答長は50-1000文字の範囲で設定してください'
      };
    }
    
    if (settings.transmission.batchInterval < 1 || settings.transmission.batchInterval > 60) {
      return {
        valid: false,
        message: 'バッチ送信間隔は1-60分の範囲で設定してください'
      };
    }
    
    // Validate API endpoint
    try {
      new URL(settings.advanced.apiEndpoint);
    } catch {
      return {
        valid: false,
        message: 'APIエンドポイントのURLが無効です'
      };
    }
    
    // Check if at least one platform is enabled
    const platformsEnabled = Object.values(settings.collection.platforms).some(enabled => enabled);
    if (settings.collection.enabled && !platformsEnabled) {
      return {
        valid: false,
        message: '少なくとも1つのプラットフォームを有効にしてください'
      };
    }
    
    return { valid: true };
  }

  async resetToDefaults() {
    const confirmed = confirm(
      'すべての設定をデフォルト値に戻します。この操作は元に戻せません。続行しますか？'
    );
    
    if (!confirmed) return;
    
    try {
      this.currentSettings = JSON.parse(JSON.stringify(this.defaultSettings));
      this.populateUI();
      this.markAsChanged();
      this.showStatus('設定をデフォルト値に戻しました', 'info');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      this.showStatus('設定のリセットに失敗しました', 'error');
    }
  }

  showStatus(message, type = 'success') {
    const statusBar = document.getElementById('statusBar');
    const statusText = statusBar.querySelector('.status-text');
    const statusIcon = statusBar.querySelector('.status-icon');
    
    // Set message and icon based on type
    statusText.textContent = message;
    
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };
    
    const colors = {
      success: '#4caf50',
      error: '#f44336',
      info: '#2196f3',
      warning: '#ff9800'
    };
    
    statusIcon.textContent = icons[type] || icons.info;
    statusBar.style.background = colors[type] || colors.info;
    
    // Show status bar
    statusBar.style.display = 'block';
    statusBar.classList.add('show');
    
    // Hide after 4 seconds
    setTimeout(() => {
      statusBar.classList.remove('show');
      setTimeout(() => {
        statusBar.style.display = 'none';
      }, 300);
    }, 4000);
  }

  // Utility method to export settings
  exportSettings() {
    const dataStr = JSON.stringify(this.currentSettings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'llm-knowledge-hub-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Utility method to import settings
  async importSettings(file) {
    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text);
      
      // Validate imported settings structure
      const validation = this.validateSettings(importedSettings);
      if (!validation.valid) {
        this.showStatus(`インポートエラー: ${validation.message}`, 'error');
        return;
      }
      
      this.currentSettings = importedSettings;
      this.populateUI();
      this.markAsChanged();
      this.showStatus('設定をインポートしました', 'success');
      
    } catch (error) {
      console.error('Failed to import settings:', error);
      this.showStatus('設定ファイルの読み込みに失敗しました', 'error');
    }
  }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const optionsManager = new OptionsManager();
  
  // Make it globally accessible for debugging
  window.optionsManager = optionsManager;
});

// Add some keyboard shortcuts for power users
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + R to reset
  if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
    e.preventDefault();
    window.optionsManager?.resetToDefaults();
  }
  
  // Ctrl/Cmd + E to export
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    window.optionsManager?.exportSettings();
  }
});

// Handle file drop for importing settings
document.addEventListener('dragover', (e) => {
  e.preventDefault();
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  
  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type === 'application/json') {
    window.optionsManager?.importSettings(files[0]);
  }
});