const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // ウィンドウ制御
    hideWindow: () => ipcRenderer.send('hide-window'),

    // クリップボード操作 (非同期化)
    readText: () => ipcRenderer.invoke('read-text'),
    readRichText: () => ipcRenderer.invoke('read-rich-text'),
    readImage: () => ipcRenderer.invoke('read-image'),
    writeText: (text) => ipcRenderer.send('write-text', text),
    writeRichText: (data) => ipcRenderer.send('write-rich-text', data),
    writeImage: (dataURL) => ipcRenderer.send('write-image', dataURL),
    availableFormats: () => ipcRenderer.invoke('get-available-formats'),

    // お気に入りデータの読み書き
    readFavorites: () => ipcRenderer.invoke('read-favorites'),
    writeFavorites: (favorites) => ipcRenderer.send('write-favorites', favorites),

    // アクティブウィンドウへの貼り付け用
    pasteToActiveWindow: () => ipcRenderer.send('paste-to-active-window'),

    // ナビゲーションキー入力イベント
    onNavKey: (callback) => ipcRenderer.on('nav-key', (event, key) => callback(key)),
});
