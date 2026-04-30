# KumasanBot セットアップガイド

## 1. Discord Developer Portal でBotを作成する

1. [Discord Developer Portal](https://discord.com/developers/applications) を開く
2. **New Application** をクリックしてアプリ名を入力（例: KumasanBot）
3. 左メニュー **Bot** → **Add Bot** をクリック

---

## 2. TOKEN と CLIENT ID の取得

| 項目 | 取得場所 | .env のキー |
|------|----------|------------|
| Bot TOKEN | Bot ページ → **Reset Token** ボタン | `DISCORD_TOKEN` |
| CLIENT ID | OAuth2 ページ → **Client ID** | `CLIENT_ID` |
| GUILD ID | Discordサーバーを右クリック → **サーバーIDをコピー** | `GUILD_ID` |

> **開発者モードの有効化**: Discord設定 → 詳細設定 → 開発者モード を ON にするとサーバーIDをコピーできるようになります。

取得したら `.env` に記入します：

```env
DISCORD_TOKEN=取得したTOKEN
CLIENT_ID=取得したCLIENT_ID
GUILD_ID=Botを動かすサーバーのID
```

---

## 3. Privileged Gateway Intents の有効化

Developer Portal の **Bot** ページ → **Privileged Gateway Intents** セクションで以下を **ON** にします。

| Intent | 要否 | 理由 |
|--------|------|------|
| PRESENCE INTENT | 不要 | — |
| **SERVER MEMBERS INTENT** | **必須** | VCメンバー取得・Bot判定に必要 |
| MESSAGE CONTENT INTENT | 任意 | 現時点では未使用 |

---

## 4. サーバー招待URL の生成

Developer Portal の **OAuth2** → **URL Generator** を開きます。

### SCOPES（以下を選択）
- `bot`
- `applications.commands`

### BOT PERMISSIONS（以下を選択）

| 権限 | 理由 |
|------|------|
| View Channels | チャンネル閲覧 |
| Send Messages | メッセージ・結果送信 |
| Embed Links | Embed送信 |
| Read Message History | 既存パネルの削除 |
| Manage Messages | パネルメッセージの削除 |
| Manage Roles | ショップでのロール付与 |
| Connect | VC状態の監視 |

> **Mention Everyone は不要**です。全ロス通知のロールメンションは別途ロール側の設定で対応します（後述）。

生成された URL をブラウザで開き、対象サーバーにBotを招待します。

---

## 5. 全ロス通知用ロールの設定

ギャンブルの全ロス発生時に通知する3つのロールは、Discord側で「メンションを許可」設定が必要です。

**対象ロールID**
- `1469319867294417051`
- `1469319364300898305`
- `1469335516036989140`

**設定手順**（3つのロールそれぞれに行う）

1. サーバー設定 → **ロール** を開く
2. 対象ロールを選択
3. **「このロールに対してメンションを許可する」** を **ON**

> BotにMention Everyone権限を与えず、ロール単位でメンションを許可する方が安全です。

---

## 6. Botの起動手順

### 依存パッケージのインストール
```bash
npm install
```

### スラッシュコマンドの登録（初回・コマンド追加時）
```bash
npm run deploy
```

### Bot起動
```bash
npm start
```

---

## 7. 初回セットアップ（起動後に行う管理者コマンド）

Botが起動したら、管理者権限を持つアカウントで以下のコマンドを実行して各チャンネルを設定します。

| コマンド | 設定内容 |
|----------|----------|
| `/admin setchannel ranking #チャンネル` | 月間ランキング自動投稿先 |
| `/admin setchannel result #チャンネル` | ガチャ・ギャンブル結果表示先 |
| `/admin setchannel log #チャンネル` | P変動ログ記録先 |
| `/admin gacha panel` | ガチャ＋ギャンブル統合パネルを設置（実行したチャンネルに送信） |
| `/admin addexclude <カテゴリ>` | ポイントカウントしないVCカテゴリを登録（カテゴリ選択式） |

---

## 8. コマンド一覧

### ユーザーコマンド

| コマンド | 説明 |
|----------|------|
| `/balance` | 現在のP残高を表示 |
| `/status` | ガチャ券枚数・P残高・今週のVC滞在時間を表示 |
| `/ranking` | 今月のVC滞在時間ランキングを表示 |
| `/pay @ユーザー <金額>` | 指定ユーザーにPを送金 |
| `/request @ユーザー <金額>` | 指定ユーザーにPを請求（承認/拒否ボタン付き） |
| `/shop` | ショップ商品一覧を表示 |
| `/buy <商品ID>` | 商品を購入 |

### 管理者コマンド（`/admin`）

| コマンド | 説明 |
|----------|------|
| `/admin setchannel ranking #ch` | ランキング投稿チャンネルを設定 |
| `/admin setchannel result #ch` | ガチャ・ギャンブル結果チャンネルを設定 |
| `/admin setchannel log #ch` | P変動ログチャンネルを設定 |
| `/admin gacha panel` | 統合パネルを設置 |
| `/admin addexclude <カテゴリ>` | 除外カテゴリを追加（カテゴリ選択式） |
| `/admin removeexclude <カテゴリ>` | 除外カテゴリを解除（カテゴリ選択式） |
| `/admin listexclude` | 除外カテゴリ一覧を表示 |
| `/admin give @ユーザー <金額>` | Pを付与 |
| `/admin take @ユーザー <金額>` | Pを徴収 |
| `/admin addshopitem <名前> <価格> <ロール>` | ショップ商品を追加（ロール選択式） |
| `/admin removeshopitem <商品ID>` | ショップ商品を削除 |
| `/admin resetranking` | 月間ランキングを手動投稿＆リセット |
