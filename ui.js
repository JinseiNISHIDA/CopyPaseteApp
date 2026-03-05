// UI関連の処理と、Logicとの橋渡しを行う
document.addEventListener('DOMContentLoaded', () => {
    const elHistoryList = document.getElementById('history-list');
    const elTabs = document.querySelectorAll('.tab');

    // タブの切り替え処理
    elTabs.forEach(elTab => {
        elTab.addEventListener('click', () => {
            // 全タブを非アクティブ化
            elTabs.forEach(t => t.classList.remove('active'));
            // クリックしたタブをアクティブ化
            elTab.classList.add('active');

            const currentTab = elTab.dataset.tab;
            if (currentTab === 'history') {
                renderHistory();
            } else if (currentTab === 'favorites') {
                renderFavorites();
            }
        });
    });

    // アイテムをクリックした時の処理（ペースト実行）
    elHistoryList.addEventListener('click', (e) => {
        const elItem = e.target.closest('.item');
        if (elItem) {
            const index = parseInt(elItem.dataset.index, 10);
            const isFavBtn = e.target.closest('.fav-btn');

            const currentTab = document.querySelector('.tab.active').dataset.tab;
            const isHistoryTab = (currentTab === 'history');

            if (isFavBtn) {
                // お気に入り切り替え
                Logic.toggleFavorite(index, isHistoryTab);
            } else {
                onItemSelected(index, isHistoryTab);
            }
        }
    });

    // マウスホイールでの横スクロール対応
    elHistoryList.parentElement.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
            e.preventDefault();
            elHistoryList.parentElement.scrollLeft += e.deltaY;
        }
    }, { passive: false });

    // キーボードナビゲーションのコアロジック
    const handleKeyNav = (e) => {
        const elItems = document.querySelectorAll('.item');
        if (elItems.length === 0) return;

        let selectedIndex = -1;
        elItems.forEach((el, index) => {
            if (el.classList.contains('selected')) {
                selectedIndex = index;
            }
        });

        if (e.key === 'ArrowRight') {
            if (selectedIndex < elItems.length - 1) {
                selectItem(selectedIndex + 1);
            } else if (selectedIndex === -1) {
                selectItem(0);
            }
        } else if (e.key === 'ArrowLeft') {
            if (selectedIndex > 0) {
                selectItem(selectedIndex - 1);
            }
        } else if (e.key === 'Enter') {
            if (selectedIndex !== -1) {
                const currentTab = document.querySelector('.tab.active').dataset.tab;
                onItemSelected(selectedIndex, currentTab === 'history');
            }
        } else if (e.key === 'Escape') {
            window.electronAPI.hideWindow();
        } else if (e.key === 'F' || e.key === 'f') { // Fキーでお気に入りトグル
            if (selectedIndex !== -1) {
                const currentTab = document.querySelector('.tab.active').dataset.tab;
                Logic.toggleFavorite(selectedIndex, currentTab === 'history');
            }
        }
    };

    // メインプロセスから送られてくるグローバルショートカットを受け取る
    if (window.electronAPI.onNavKey) {
        window.electronAPI.onNavKey((key) => {
            const map = {
                'Right': 'ArrowRight',
                'Left': 'ArrowLeft',
                'Up': 'ArrowUp',
                'Down': 'ArrowDown',
                'Enter': 'Enter',
                'Escape': 'Escape'
            };
            handleKeyNav({ key: map[key] || key });
        });
    }

    // デバッグ等でローカルフォーカスがあった場合のため直接のイベントも登録しておく
    document.addEventListener('keydown', handleKeyNav);

    // --- Functions ---

    // アイテムを選択状態にする
    function selectItem(index) {
        const elItems = document.querySelectorAll('.item');
        elItems.forEach((el, i) => {
            if (i === index) {
                el.classList.add('selected');
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            } else {
                el.classList.remove('selected');
            }
        });
    }

    // 選択されたアイテムをクリップボードに戻してペーストし、ウィンドウを隠す
    function onItemSelected(index, isHistoryTab) {
        Logic.pasteItem(index, isHistoryTab);
    }

    function renderItems(items, isHistoryTab) {
        elHistoryList.innerHTML = ''; // クリア

        if (items.length === 0) {
            elHistoryList.innerHTML = `<li style="color:white; padding: 20px;">${isHistoryTab ? '履歴がありません' : 'お気に入りがありません'}</li>`;
            return;
        }

        items.forEach((item, index) => {
            const elLi = document.createElement('li');
            elLi.className = 'item';
            if (index === 0) elLi.classList.add('selected'); // 最初を選択状態に
            elLi.dataset.index = index;

            // お気に入りボタン(星マークなど)
            const isFav = isHistoryTab ? Logic.isFavorite(item) : true;
            const elFavBtn = document.createElement('div');
            elFavBtn.className = 'fav-btn';
            elFavBtn.style.position = 'absolute';
            elFavBtn.style.top = '10px';
            elFavBtn.style.right = '10px';
            elFavBtn.style.cursor = 'pointer';
            elFavBtn.style.fontSize = '18px';
            elFavBtn.textContent = isFav ? '★' : '☆';
            elFavBtn.style.color = isFav ? '#ffd700' : 'rgba(255,255,255,0.3)';
            elFavBtn.title = 'Fキーでも切り替え可能';

            // アイテムの中身
            const elContent = document.createElement('div');
            elContent.className = 'item-content';

            if (item.type === 'text') {
                elContent.textContent = item.content;
            } else if (item.type === 'rich-text') {
                elContent.textContent = item.content.text; // UIにはプレーンテキスト部分のみ表示
            } else if (item.type === 'image') {
                const elImg = document.createElement('img');
                elImg.src = item.content;
                elImg.style.maxWidth = '100%';
                elImg.style.maxHeight = '100%';
                elImg.style.objectFit = 'contain';
                elContent.appendChild(elImg);
            }

            // メタ情報（時間など）
            const elMeta = document.createElement('div');
            elMeta.className = 'item-meta';
            const elTime = document.createElement('span');
            elTime.textContent = item.timeStr;
            elMeta.appendChild(elTime);

            elLi.style.position = 'relative'; // fav-btn用
            elLi.appendChild(elFavBtn);
            elLi.appendChild(elContent);
            elLi.appendChild(elMeta);
            elHistoryList.appendChild(elLi);
        });
    }

    // 履歴のレンダリング
    function renderHistory() {
        renderItems(Logic.getHistory(), true);
    }

    function renderFavorites() {
        renderItems(Logic.getFavorites(), false);
    }

    // logic.jsから呼ばれるコールバック：履歴が更新されたら再描画
    window.onHistoryUpdated = () => {
        const currentTab = document.querySelector('.tab.active').dataset.tab;
        if (currentTab === 'history') {
            renderHistory();
        } else if (currentTab === 'favorites') {
            renderFavorites();
        }
    };

});
