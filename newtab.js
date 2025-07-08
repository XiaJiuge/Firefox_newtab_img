// FastTab - 新标签页扩展主脚本

class FastTab {
    constructor() {
        this.defaultConfig = [];
        this.userConfig = [];
        this.settings = {
            iconSize: 120,
            iconFont: 'Microsoft YaHei, sans-serif',
            iconMaxWidth: 6,
            iconRadius: 8,
            verticalSpacing: 20,
            rowSpacing: 30,
            searchEngine: 'google'
        };
        this.searchEngines = {
            google: 'https://www.google.com/search?q=',
            baidu: 'https://www.baidu.com/s?wd=',
            bing: 'https://www.bing.com/search?q=',
            bilibili: 'https://search.bilibili.com/all?keyword=',
            wikipedia: 'https://zh.wikipedia.org/wiki/Special:Search?search='
        };
        this.imageCache = new Map();
        this.init();
    }

    async init() {
        try {
            await this.loadDefaultConfig();
            await this.loadUserData();
            this.setupEventListeners();
            this.renderIcons();
            this.applySettings();
            this.showStatus('FastTab 加载完成', 'success');
        } catch (error) {
            console.error('初始化失败:', error);
            this.showStatus('初始化失败', 'error');
        }
    }

    async loadDefaultConfig() {
        try {
            const response = await fetch('browser_extension_config.json');
            this.defaultConfig = await response.json();
        } catch (error) {
            console.error('加载默认配置失败:', error);
            this.defaultConfig = [];
        }
    }

    async loadUserData() {
        return new Promise((resolve) => {
            if (typeof browser !== 'undefined' && browser.storage) {
                // Firefox WebExtensions API
                browser.storage.local.get(['userConfig', 'settings']).then((result) => {
                    this.userConfig = result.userConfig || [...this.defaultConfig];
                    this.settings = { ...this.settings, ...(result.settings || {}) };
                    resolve();
                });
            } else {
                // 后备方案：使用 localStorage
                try {
                    const userConfig = localStorage.getItem('fastTab_userConfig');
                    const settings = localStorage.getItem('fastTab_settings');
                    this.userConfig = userConfig ? JSON.parse(userConfig) : [...this.defaultConfig];
                    this.settings = { ...this.settings, ...(settings ? JSON.parse(settings) : {}) };
                } catch (error) {
                    console.error('从 localStorage 加载数据失败:', error);
                    this.userConfig = [...this.defaultConfig];
                }
                resolve();
            }
        });
    }

    async saveUserData() {
        return new Promise((resolve) => {
            if (typeof browser !== 'undefined' && browser.storage) {
                // Firefox WebExtensions API
                browser.storage.local.set({
                    userConfig: this.userConfig,
                    settings: this.settings
                }).then(() => {
                    resolve();
                });
            } else {
                // 后备方案：使用 localStorage
                try {
                    localStorage.setItem('fastTab_userConfig', JSON.stringify(this.userConfig));
                    localStorage.setItem('fastTab_settings', JSON.stringify(this.settings));
                } catch (error) {
                    console.error('保存到 localStorage 失败:', error);
                }
                resolve();
            }
        });
    }

    setupEventListeners() {
        // 搜索功能
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        const searchEngine = document.getElementById('searchEngine');

        searchButton.addEventListener('click', () => this.performSearch());
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        searchEngine.addEventListener('change', (e) => {
            this.settings.searchEngine = e.target.value;
            this.saveUserData();
        });

        // 设置搜索引擎默认值
        searchEngine.value = this.settings.searchEngine;

        // 工具栏按钮
        document.getElementById('addIconBtn').addEventListener('click', () => this.showAddIconModal());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettingsModal());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetToDefault());

        // 模态框
        this.setupModalEvents();

        // 设置表单
        this.setupSettingsForm();
    }

    setupModalEvents() {
        // 添加图标模态框
        const addModal = document.getElementById('addIconModal');
        const settingsModal = document.getElementById('settingsModal');
        const closeBtns = document.querySelectorAll('.close, .cancel');

        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                addModal.style.display = 'none';
                settingsModal.style.display = 'none';
            });
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target === addModal) addModal.style.display = 'none';
            if (e.target === settingsModal) settingsModal.style.display = 'none';
        });

        // 添加图标表单
        document.getElementById('addIconForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addNewIcon();
        });
    }

    setupSettingsForm() {
        const form = document.getElementById('settingsForm');
        const inputs = {
            iconSize: document.getElementById('iconSize'),
            iconFont: document.getElementById('iconFont'),
            iconMaxWidth: document.getElementById('iconMaxWidth'),
            iconRadius: document.getElementById('iconRadius'),
            verticalSpacing: document.getElementById('verticalSpacing'),
            rowSpacing: document.getElementById('rowSpacing')
        };

        // 设置初始值
        Object.keys(inputs).forEach(key => {
            if (inputs[key]) {
                inputs[key].value = this.settings[key];
                
                // 为范围输入添加实时更新
                if (inputs[key].type === 'range') {
                    const valueSpan = document.getElementById(key + 'Value');
                    if (valueSpan) {
                        valueSpan.textContent = this.settings[key] + (key.includes('Size') || key.includes('Spacing') || key.includes('Radius') ? 'px' : '');
                        inputs[key].addEventListener('input', () => {
                            valueSpan.textContent = inputs[key].value + (key.includes('Size') || key.includes('Spacing') || key.includes('Radius') ? 'px' : '');
                        });
                    }
                }
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
    }

    performSearch() {
        const query = document.getElementById('searchInput').value.trim();
        const engine = document.getElementById('searchEngine').value;
        
        if (query) {
            const searchUrl = this.searchEngines[engine] + encodeURIComponent(query);
            window.open(searchUrl, '_blank');
        }
    }

    showAddIconModal() {
        document.getElementById('addIconModal').style.display = 'block';
        // 清空表单
        document.getElementById('addIconForm').reset();
    }

    showSettingsModal() {
        document.getElementById('settingsModal').style.display = 'block';
    }

    async addNewIcon() {
        const url = document.getElementById('iconUrl').value;
        const label = document.getElementById('iconLabel').value;
        const customScreenshotURL = document.getElementById('iconImage').value;

        const newIcon = {
            url: url,
            label: label
        };

        if (customScreenshotURL) {
            newIcon.customScreenshotURL = customScreenshotURL;
        }

        this.userConfig.push(newIcon);
        await this.saveUserData();
        this.renderIcons();
        document.getElementById('addIconModal').style.display = 'none';
        this.showStatus('图标添加成功', 'success');
    }

    async deleteIcon(index) {
        if (confirm('确定要删除这个图标吗？')) {
            this.userConfig.splice(index, 1);
            await this.saveUserData();
            this.renderIcons();
            this.showStatus('图标删除成功', 'success');
        }
    }

    async saveSettings() {
        const inputs = {
            iconSize: document.getElementById('iconSize'),
            iconFont: document.getElementById('iconFont'),
            iconMaxWidth: document.getElementById('iconMaxWidth'),
            iconRadius: document.getElementById('iconRadius'),
            verticalSpacing: document.getElementById('verticalSpacing'),
            rowSpacing: document.getElementById('rowSpacing')
        };

        Object.keys(inputs).forEach(key => {
            if (inputs[key]) {
                this.settings[key] = inputs[key].type === 'range' ? 
                    parseInt(inputs[key].value) : inputs[key].value;
            }
        });

        await this.saveUserData();
        this.applySettings();
        document.getElementById('settingsModal').style.display = 'none';
        this.showStatus('设置保存成功', 'success');
    }

    applySettings() {
        const root = document.documentElement;
        root.style.setProperty('--icon-size', this.settings.iconSize + 'px');
        root.style.setProperty('--icon-font', this.settings.iconFont);
        root.style.setProperty('--max-icons-per-row', this.settings.iconMaxWidth);
        root.style.setProperty('--icon-radius', this.settings.iconRadius + 'px');
        root.style.setProperty('--vertical-spacing', this.settings.verticalSpacing + 'px');
        root.style.setProperty('--row-spacing', this.settings.rowSpacing + 'px');
    }

    async resetToDefault() {
        if (confirm('确定要重置为默认设置吗？这将删除所有自定义图标和设置。')) {
            this.userConfig = [...this.defaultConfig];
            this.settings = {
                iconSize: 120,
                iconFont: 'Microsoft YaHei, sans-serif',
                iconMaxWidth: 6,
                iconRadius: 8,
                verticalSpacing: 20,
                rowSpacing: 30,
                searchEngine: 'google'
            };
            await this.saveUserData();
            this.renderIcons();
            this.applySettings();
            this.showStatus('已重置为默认设置', 'info');
        }
    }

    async renderIcons() {
        const grid = document.getElementById('iconGrid');
        grid.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            // 预加载图片
            await this.preloadImages();
            
            grid.innerHTML = '';
            
            this.userConfig.forEach((icon, index) => {
                const iconElement = this.createIconElement(icon, index);
                grid.appendChild(iconElement);
            });

            // 设置拖拽排序
            this.setupDragAndDrop();
        } catch (error) {
            console.error('渲染图标失败:', error);
            grid.innerHTML = '<p style="text-align: center; color: white;">加载图标失败</p>';
        }
    }

    async preloadImages() {
        const imagePromises = this.userConfig.map(async (icon) => {
            if (icon.customScreenshotURL) {
                try {
                    await this.loadImage(icon.customScreenshotURL);
                } catch (error) {
                    console.warn('图片加载失败:', icon.customScreenshotURL);
                }
            }
        });
        
        await Promise.allSettled(imagePromises);
    }

    loadImage(url) {
        return new Promise((resolve, reject) => {
            if (this.imageCache.has(url)) {
                resolve(this.imageCache.get(url));
                return;
            }

            const img = new Image();
            img.onload = () => {
                this.imageCache.set(url, img);
                resolve(img);
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    createIconElement(icon, index) {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'icon-item';
        iconDiv.draggable = true;
        iconDiv.dataset.index = index;

        const img = document.createElement('img');
        img.className = 'icon-image';
        img.alt = icon.label;
        
        if (icon.customScreenshotURL) {
            img.src = icon.customScreenshotURL;
            img.onerror = () => {
                img.src = this.generateFallbackIcon(icon.label);
            };
        } else {
            img.src = this.generateFallbackIcon(icon.label);
        }

        const label = document.createElement('div');
        label.className = 'icon-label';
        label.textContent = icon.label;

        const controls = document.createElement('div');
        controls.className = 'icon-controls';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'control-btn delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = '删除';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteIcon(index);
        });

        controls.appendChild(deleteBtn);

        iconDiv.appendChild(img);
        iconDiv.appendChild(label);
        iconDiv.appendChild(controls);

        // 点击事件
        iconDiv.addEventListener('click', () => {
            window.open(icon.url, '_blank');
        });

        return iconDiv;
    }

    generateFallbackIcon(label) {
        // 生成简单的文字图标
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');

        // 背景
        ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16);
        ctx.fillRect(0, 0, 120, 120);

        // 文字
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label.charAt(0), 60, 60);

        return canvas.toDataURL();
    }

    setupDragAndDrop() {
        const items = document.querySelectorAll('.icon-item');
        
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.index);
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                document.querySelectorAll('.icon-item').forEach(el => 
                    el.classList.remove('drag-over'));
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                item.classList.add('drag-over');
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const targetIndex = parseInt(item.dataset.index);
                
                if (draggedIndex !== targetIndex) {
                    this.reorderIcons(draggedIndex, targetIndex);
                }
                
                item.classList.remove('drag-over');
            });
        });
    }

    async reorderIcons(fromIndex, toIndex) {
        const item = this.userConfig.splice(fromIndex, 1)[0];
        this.userConfig.splice(toIndex, 0, item);
        await this.saveUserData();
        this.renderIcons();
        this.showStatus('图标顺序已更新', 'success');
    }

    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('statusMessage');
        statusEl.textContent = message;
        statusEl.className = `status-message ${type} show`;
        
        setTimeout(() => {
            statusEl.classList.remove('show');
        }, 3000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new FastTab();
});

// 处理扩展上下文
if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
    // Chrome 兼容性
    window.browser = chrome;
}