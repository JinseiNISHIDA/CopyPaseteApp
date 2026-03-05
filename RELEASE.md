# CopyPaste アプリ リリース手順書

このアプリケーションは、GitHub Actions を使用してWindows用のインストーラー（`.exe`）を自動ビルドおよびGitHub Releaseへ公開するよう設定されています。

新しいバージョンをリリースしたい場合は、以下のいずれかの方法で**「バージョンタグ」を作成してGitHubへプッシュ**するだけで完了します。

---

## 方法1: コマンドライン（Git）で行う場合 (推奨)

ターミナル（またはVS Codeのターミナル）で、以下のコマンドを順番に実行します。

1. **バージョンの更新とコミット作成:**
   `package.json` のバージョン番号を自動更新し、コミットとタグを作成します。（例：パッチバージョンを上げる場合）
   ```bash
   npm version patch -m "chore: release %s"
   ```
   > ※ `patch` は `v1.0.1` -> `v1.0.2` のように末尾が上がります。
   > 大規模な変更時は `minor` (v1.1.0) や `major` (v2.0.0) を指定してください。

2. **タグをGitHubにプッシュ:**
   作成されたタグをリモートに送信し、自動リリースをキックします。
   ```bash
   git push origin main --tags
   ```

3. プッシュ後、数分以内にGitHubの [Actionsタブ](https://github.com/JinseiNISHIDA/CopyPaseteApp/actions) でビルドが完了し、[Releasesページ](https://github.com/JinseiNISHIDA/CopyPaseteApp/releases) に新しいインストーラーが公開されます。

---

## 方法2: GitHubの画面から直接行う場合

もしコマンドを使わずにブラウザ上でリリースしたい場合はこちらの手順で行います。

1. GitHubの [Releasesページ](https://github.com/JinseiNISHIDA/CopyPaseteApp/releases) にアクセスします。
2. 「**Draft a new release**」ボタンをクリックします。
3. 「**Choose a tag**」をクリックし、新しいタグ名（例: `v1.0.2`）を入力して「Create new tag: v1.0.2 on publish」を選択します。（※必ず `v` から始めてください）
4. Title（リリース名）と説明文（変更点など）を任意で入力します。
5. 一番下の「**Publish release**」ボタンをクリックします。
6. この操作によっても「タグ」が作られるため、自動的にGitHub Actionsがトリガーされ、数分後にインストーラーファイル（`.exe`）がこのリリース画面にアタッチされます。

---

### トラブルシューティング
- もしエラーでビルドが止まってしまった場合は、GitHubの [Actionsタブ](https://github.com/JinseiNISHIDA/CopyPaseteApp/actions) のログを確認してください。
- インストーラー形式（`.exe`）にするには `electron-builder` が裏側で動作しています。詳細は `.github/workflows/release.yml` および `package.json` の `build` セクションを確認してください。
