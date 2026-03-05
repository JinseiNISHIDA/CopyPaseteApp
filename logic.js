// クリップボードの監視、データ管理を行うロジック層
const Logic = (() => {
    let historyItems = [];
    let lastText = '';
    let lastImageHash = ''; // シンプルな重複判定用

    let favoritesItems = [];

    // アプリ起動時の初期化
    async function init() {
        // ローカルストレージのお気に入りなどを読み込む
        favoritesItems = await window.electronAPI.readFavorites() || [];
        startClipboardPolling();
    }

    // ポーリングを開始してクリップボードの変更を監視する
    function startClipboardPolling() {
        setInterval(checkClipboard, Config.POLLING_INTERVAL_MS);
    }

    // クリップボードの内容をチェック
    async function checkClipboard() {
        const formats = await window.electronAPI.availableFormats();
        console.log("checkClipboard formats:", formats);

        // 画像が含まれている場合（優先）
        if (formats.includes('image/png') || formats.includes('image/jpeg')) {
            const dataURL = await window.electronAPI.readImage();
            if (dataURL && dataURL !== lastImageHash) {
                lastImageHash = dataURL;
                lastText = ''; // テキスト側もクリアして次回重複を防ぐ
                addItemToHistory({ type: 'image', content: dataURL });
            }
        }
        // テキストが含まれている場合（プレーンテキスト、HTML、RTFなど）
        else if (formats.includes('text/plain') || formats.includes('text/html') || formats.includes('text/rtf')) {
            let richData = await window.electronAPI.readRichText();
            let text = richData.text || '';

            // 文字数制限
            if (text.length > Config.MAX_TEXT_LENGTH) {
                text = text.substring(0, Config.MAX_TEXT_LENGTH) + '...';
                richData.text = text;
                richData.html = ''; // 切り詰めた場合は構造が壊れるためプレーンテキストにする
                richData.rtf = '';
            }

            // 変化があれば追加 (主にプレーンテキストで差異判定)
            if (text && text !== lastText) {
                lastText = text;
                lastImageHash = '';
                addItemToHistory({ type: 'rich-text', content: richData });
            }
        }
    }

    // 履歴にアイテムを追加
    function addItemToHistory(item) {
        // 日付フォーマット
        const now = new Date();
        item.timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        item.id = Date.now().toString();

        // 先頭に追加
        historyItems.unshift(item);

        // 最大件数を超えたら古いものを削除
        if (historyItems.length > Config.MAX_HISTORY_ITEMS) {
            historyItems.pop();
        }

        // UIに変更を通知
        if (typeof window.onHistoryUpdated === 'function') {
            window.onHistoryUpdated();
        }
    }

    // 現在の履歴を取得
    function getHistory() {
        return historyItems;
    }

    // アイテムの同一性判定
    function isSameItem(a, b) {
        if (a.type !== b.type) return false;
        if (a.type === 'text' || a.type === 'image') return a.content === b.content;
        if (a.type === 'rich-text') return a.content.text === b.content.text;
        return false;
    }

    // お気に入り一覧取得
    function getFavorites() {
        return favoritesItems;
    }

    // お気に入りか確認
    function isFavorite(item) {
        return favoritesItems.some(f => isSameItem(f, item));
    }

    // お気に入りの切り替え
    function toggleFavorite(index, isFromHistoryTab) {
        let item;
        if (isFromHistoryTab) {
            item = historyItems[index];
            const favIndex = favoritesItems.findIndex(f => isSameItem(f, item));
            if (favIndex >= 0) {
                favoritesItems.splice(favIndex, 1);
            } else {
                favoritesItems.unshift({ ...item });
            }
        } else {
            // お気に入りタブで削除
            favoritesItems.splice(index, 1);
        }

        window.electronAPI.writeFavorites(favoritesItems);

        // UIに変更を通知
        if (typeof window.onHistoryUpdated === 'function') {
            window.onHistoryUpdated();
        }
    }

    // 選択したアイテムをクリップボードにセットし、ペースト実行
    function pasteItem(index, isFromHistoryTab, asPlainText = false) {
        const items = isFromHistoryTab ? historyItems : favoritesItems;
        if (index < 0 || index >= items.length) return;
        const item = items[index];

        // 再度クリップボードに書き込む（これで先頭に来るようにもなる）
        if (item.type === 'text') {
            window.electronAPI.writeText(item.content);
            lastText = item.content; // 自分自身での変更としてマーク
        } else if (item.type === 'rich-text') {
            if (asPlainText) {
                window.electronAPI.writeText(item.content.text);
                lastText = item.content.text;
            } else {
                window.electronAPI.writeRichText(item.content);
                lastText = item.content.text;
            }
        } else if (item.type === 'image') {
            window.electronAPI.writeImage(item.content);
            lastImageHash = item.content;
        }

        // ウィンドウを隠して、アクティブウィンドウにペーストを投げる
        window.electronAPI.hideWindow();

        // フォーカスは失われていないはずなので、わずかな遅延で十分
        setTimeout(() => {
            window.electronAPI.pasteToActiveWindow();
        }, 50);
    }

    // 公開API
    return {
        init,
        getHistory,
        getFavorites,
        isFavorite,
        toggleFavorite,
        pasteItem
    };
})();

// DOMロード後にLogicを初期化
document.addEventListener('DOMContentLoaded', () => {
    Logic.init();
});
