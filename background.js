// FastTab 后台脚本

// 扩展安装时的初始化
browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('FastTab 扩展已安装');
        
        // 设置默认配置
        browser.storage.local.set({
            'settings': {
                iconSize: 120,
                iconFont: 'Microsoft YaHei, sans-serif',
                iconMaxWidth: 6,
                iconRadius: 8,
                verticalSpacing: 20,
                rowSpacing: 30,
                searchEngine: 'google'
            }
        });
    } else if (details.reason === 'update') {
        console.log('FastTab 扩展已更新');
    }
});

// 处理图标缓存清理
browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.userConfig) {
        console.log('用户配置已更新');
    }
});

// 清理过期的缓存数据
function cleanupCache() {
    browser.storage.local.get(null).then((items) => {
        const keysToRemove = [];
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        
        Object.keys(items).forEach(key => {
            if (key.startsWith('cache_') && items[key].timestamp < oneWeekAgo) {
                keysToRemove.push(key);
            }
        });
        
        if (keysToRemove.length > 0) {
            browser.storage.local.remove(keysToRemove);
            console.log('清理了', keysToRemove.length, '个过期缓存项');
        }
    });
}

// 每天清理一次缓存
browser.alarms.create('cleanupCache', { periodInMinutes: 24 * 60 });

browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanupCache') {
        cleanupCache();
    }
});

// 处理消息传递（如果需要）
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getVersion') {
        sendResponse({ version: browser.runtime.getManifest().version });
    }
    
    return true; // 保持消息通道开放
});