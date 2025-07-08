// FastTab 设置页面脚本

class OptionsManager {
    constructor() {
        this.settings = {
            iconSize: 120,
            iconFont: 'Microsoft YaHei, sans-serif',
            iconMaxWidth: 6,
            iconRadius: 8,
            verticalSpacing: 20,
            rowSpacing: 30,
            searchEngine: 'google'
        };
        this.userConfig = [];
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.updateUI();
    }

    async loadSettings() {
        return new Promise((resolve) => {
            if (typeof browser !== 'undefined' && browser.storage) {
                browser.storage.local.get(['settings', 'userConfig']).then((result) => {
                    this.settings = { ...this.settings, ...(result.settings || {}) };
                    this.userConfig = result.userConfig || [];
                    resolve();
                });
            } else {
                // 后备方案
                try {
                    const settings = localStorage.getItem('fastTab_settings');
                    const userConfig = localStorage.getItem('fastTab_userConfig');
                    this.settings = { ...this.settings, ...(settings ? JSON.parse(settings) : {}) };
                    this.userConfig = userConfig ? JSON.parse(userConfig) : [];
                } catch (error) {
                    console.error('加载设置失败:', error);
                }
                resolve();
            }
        });
    }

    async saveSettings() {
        return new Promise((resolve) => {
            if (typeof browser !== 'undefined' && browser.storage) {
                browser.storage.local.set({
                    settings: this.settings,
                    userConfig: this.userConfig
                }).then(() => {
                    resolve();
                });
            } else {
                try {
                    localStorage.setItem('fastTab_settings', JSON.stringify(this.settings));
                    localStorage.setItem('fastTab_userConfig', JSON.stringify(this.userConfig));
                } catch (error) {
                    console.error('保存设置失败:', error);
                }
                resolve();
            }
        });
    }

    setupEventListeners() {
        // 外观设置表单
        document.getElementById('appearanceForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveAppearanceSettings();
        });

        // 搜索设置表单
        document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSearchSettings();
        });

        // 范围输入实时更新
        this.setupRangeInputs();

        // 数据管理按钮
        document.getElementById('exportBtn').addEventListener('click', () => this.exportConfig());
        document.getElementById('importBtn').addEventListener('click', () => this.importConfig());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetSettings());
    }

    setupRangeInputs() {
        const rangeInputs = ['iconSize', 'iconMaxWidth', 'iconRadius', 'verticalSpacing', 'rowSpacing'];
        
        rangeInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            const valueSpan = document.getElementById(inputId + 'Value');
            
            if (input && valueSpan) {
                input.addEventListener('input', () => {
                    const value = input.value;
                    const unit = inputId.includes('Size') || inputId.includes('Spacing') || inputId.includes('Radius') ? 'px' : '';
                    valueSpan.textContent = value + unit;
                });
            }
        });
    }

    updateUI() {
        // 更新外观设置
        document.getElementById('iconSize').value = this.settings.iconSize;
        document.getElementById('iconSizeValue').textContent = this.settings.iconSize + 'px';
        
        document.getElementById('iconFont').value = this.settings.iconFont;
        
        document.getElementById('iconMaxWidth').value = this.settings.iconMaxWidth;
        document.getElementById('iconMaxWidthValue').textContent = this.settings.iconMaxWidth;
        
        document.getElementById('iconRadius').value = this.settings.iconRadius;
        document.getElementById('iconRadiusValue').textContent = this.settings.iconRadius + 'px';
        
        document.getElementById('verticalSpacing').value = this.settings.verticalSpacing;
        document.getElementById('verticalSpacingValue').textContent = this.settings.verticalSpacing + 'px';
        
        document.getElementById('rowSpacing').value = this.settings.rowSpacing;
        document.getElementById('rowSpacingValue').textContent = this.settings.rowSpacing + 'px';

        // 更新搜索设置
        document.getElementById('defaultSearchEngine').value = this.settings.searchEngine;
    }

    async saveAppearanceSettings() {
        this.settings.iconSize = parseInt(document.getElementById('iconSize').value);
        this.settings.iconFont = document.getElementById('iconFont').value;
        this.settings.iconMaxWidth = parseInt(document.getElementById('iconMaxWidth').value);
        this.settings.iconRadius = parseInt(document.getElementById('iconRadius').value);
        this.settings.verticalSpacing = parseInt(document.getElementById('verticalSpacing').value);
        this.settings.rowSpacing = parseInt(document.getElementById('rowSpacing').value);

        try {
            await this.saveSettings();
            this.showStatus('外观设置保存成功', 'success');
        } catch (error) {
            this.showStatus('保存失败: ' + error.message, 'error');
        }
    }

    async saveSearchSettings() {
        this.settings.searchEngine = document.getElementById('defaultSearchEngine').value;

        try {
            await this.saveSettings();
            this.showStatus('搜索设置保存成功', 'success');
        } catch (error) {
            this.showStatus('保存失败: ' + error.message, 'error');
        }
    }

    exportConfig() {
        const config = {
            version: '1.0.0',
            settings: this.settings,
            userConfig: this.userConfig,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `fasttab-config-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showStatus('配置导出成功', 'success');
    }

    importConfig() {
        const fileInput = document.getElementById('importFile');
        const file = fileInput.files[0];

        if (!file) {
            this.showStatus('请选择一个配置文件', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const config = JSON.parse(e.target.result);
                
                if (config.settings) {
                    this.settings = { ...this.settings, ...config.settings };
                }
                
                if (config.userConfig) {
                    this.userConfig = config.userConfig;
                }

                await this.saveSettings();
                this.updateUI();
                this.showStatus('配置导入成功', 'success');
            } catch (error) {
                this.showStatus('导入失败: 无效的配置文件', 'error');
            }
        };

        reader.readAsText(file);
    }

    async resetSettings() {
        if (confirm('确定要重置所有设置为默认值吗？这将删除所有自定义配置。')) {
            this.settings = {
                iconSize: 120,
                iconFont: 'Microsoft YaHei, sans-serif',
                iconMaxWidth: 6,
                iconRadius: 8,
                verticalSpacing: 20,
                rowSpacing: 30,
                searchEngine: 'google'
            };

            // 加载默认配置
            try {
                const response = await fetch('../browser_extension_config.json');
                this.userConfig = await response.json();
            } catch (error) {
                this.userConfig = [];
            }

            try {
                await this.saveSettings();
                this.updateUI();
                this.showStatus('设置已重置为默认值', 'success');
            } catch (error) {
                this.showStatus('重置失败: ' + error.message, 'error');
            }
        }
    }

    showStatus(message, type) {
        const statusEl = document.getElementById('statusMessage');
        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;
        statusEl.style.display = 'block';

        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}

// 初始化设置管理器
document.addEventListener('DOMContentLoaded', () => {
    new OptionsManager();
});

// 处理浏览器兼容性
if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
    window.browser = chrome;
}