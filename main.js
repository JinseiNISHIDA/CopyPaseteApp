const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('node:path');

// Constants
const WINDOW_WIDTH = 800;
const WINDOW_HEIGHT = 400;

let mainWindow;
let tray = null;

function createWindow() {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    mainWindow = new BrowserWindow({
        width: width, // 画面幅いっぱい
        height: WINDOW_HEIGHT,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        focusable: false, // フォーカスを奪わない
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.setPosition(
        0, // 左端から
        Math.round(height - WINDOW_HEIGHT) // 下部ピッタリか少し浮かせるなら-20など
    );

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer] ${message}`);
    });
}

const NAV_KEYS = ['Up', 'Down', 'Left', 'Right', 'Shift+Left', 'Shift+Right', 'Enter', 'Shift+Enter', 'Escape', 'Home', 'End'];

function registerNavShortcuts() {
    NAV_KEYS.forEach(k => {
        globalShortcut.register(k, () => {
            if (mainWindow && mainWindow.isVisible()) {
                mainWindow.webContents.send('nav-key', k);
            }
        });
    });
}

function unregisterNavShortcuts() {
    NAV_KEYS.forEach(k => globalShortcut.unregister(k));
}

function toggleWindow() {
    if (mainWindow.isVisible()) {
        mainWindow.hide();
        unregisterNavShortcuts();
    } else {
        mainWindow.showInactive(); // アクティブにせずに表示
        registerNavShortcuts();
    }
}

app.whenReady().then(() => {
    createWindow();

    // システムトレイの作成
    tray = new Tray(path.join(__dirname, 'icon.ico'));
    const contextMenu = Menu.buildFromTemplate([
        { label: '表示 / 非表示', click: () => toggleWindow() },
        { type: 'separator' },
        { label: '終了', click: () => { app.isQuitting = true; app.quit(); } }
    ]);
    tray.setToolTip('CopyPaste');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => toggleWindow());

    const ret = globalShortcut.register('CommandOrControl+Shift+V', () => {
        toggleWindow();
    });

    if (!ret) {
        console.log('registration failed');
    }

    // ウィンドウの×ボタンで閉じてもアプリを終了しない
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            unregisterNavShortcuts();
        }
    });

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // IPC handlers
    ipcMain.on('hide-window', () => {
        if (mainWindow) {
            mainWindow.hide();
            unregisterNavShortcuts();
        }
    });

    ipcMain.handle('get-available-formats', () => {
        const { clipboard } = require('electron');
        return clipboard.availableFormats();
    });
    ipcMain.handle('read-text', () => {
        const { clipboard } = require('electron');
        return clipboard.readText();
    });
    ipcMain.handle('read-rich-text', () => {
        const { clipboard } = require('electron');
        return {
            html: clipboard.readHTML(),
            rtf: clipboard.readRTF(),
            text: clipboard.readText()
        };
    });
    ipcMain.handle('read-image', () => {
        const { clipboard } = require('electron');
        const img = clipboard.readImage();
        return img.isEmpty() ? null : img.toDataURL();
    });
    ipcMain.on('write-text', (event, text) => {
        const { clipboard } = require('electron');
        clipboard.writeText(text);
    });
    ipcMain.on('write-rich-text', (event, data) => {
        const { clipboard } = require('electron');
        // HTMLとRTFの両方を同時に書き込める write メソッドを使用
        const writeData = {};
        if (data.html) writeData.html = data.html;
        if (data.rtf) writeData.rtf = data.rtf;
        if (data.text) writeData.text = data.text;
        clipboard.write(writeData);
    });
    ipcMain.on('write-image', (event, dataURL) => {
        const { clipboard, nativeImage } = require('electron');
        const img = nativeImage.createFromDataURL(dataURL);
        clipboard.writeImage(img);
    });

    // お気に入りデータの永続化用IPC
    const fs = require('fs');
    const favoritesPath = path.join(app.getPath('userData'), 'favorites.json');

    ipcMain.handle('read-favorites', () => {
        try {
            if (fs.existsSync(favoritesPath)) {
                const data = fs.readFileSync(favoritesPath, 'utf-8');
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to read favorites', e);
        }
        return [];
    });

    ipcMain.on('write-favorites', (event, favorites) => {
        try {
            fs.writeFileSync(favoritesPath, JSON.stringify(favorites));
        } catch (e) {
            console.error('Failed to write favorites', e);
        }
    });

    // ペーストをシミュレートする処理
    ipcMain.on('paste-to-active-window', () => {
        try {
            const robot = require('@hurdlegroup/robotjs');
            // 'v' キーを 'control' を押しながらタップする
            robot.keyTap('v', ['control']);
            console.log('Paste simulation via robotjs succeeded.');
        } catch (err) {
            console.error('Paste simulation via robotjs failed:', err);
        }
    });

});

// 常駐アプリとしてウィンドウが閉じてもアプリは終了しない
app.on('window-all-closed', function () {
    // 何もしない（トレイに常駐）
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
