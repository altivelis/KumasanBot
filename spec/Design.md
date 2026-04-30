# 詳細設計書 — KumasanBot

## タイムゾーン設計

- **すべての時刻処理は JST（Asia/Tokyo, UTC+9）基準**で行う
- `process.env.TZ = 'Asia/Tokyo'` を `index.js` の先頭で設定し、Node.js 全体のデフォルトタイムゾーンを固定する
- `node-cron` のスケジュール登録には `timezone: 'Asia/Tokyo'` オプションを必ず指定する
- P変動ログ・ランキング投稿など日時を表示する箇所は `dayjs` + `timezone` プラグインを使用し、JST でフォーマットする
- DB に保存する `created_at` 等は UNIXタイム（ms）のまま保存し、**表示時にのみ JST 変換**する

---

## アーキテクチャ概要

```
KumasanBot/
├── .env                        # トークン・設定値
├── package.json
├── src/
│   ├── index.js                # エントリーポイント（Bot起動・イベント登録）
│   ├── deploy-commands.js      # スラッシュコマンド登録スクリプト
│   ├── database.js             # SQLite初期化・共通クエリ関数
│   ├── commands/               # スラッシュコマンド定義
│   │   ├── admin.js            # /admin サブコマンド群
│   │   ├── pay.js              # /pay
│   │   ├── request.js          # /request
│   │   ├── status.js           # /status
│   │   ├── balance.js          # /balance
│   │   ├── ranking.js          # /ranking
│   │   ├── shop.js             # /shop
│   │   └── buy.js              # /buy
│   ├── events/                 # Discordイベントハンドラ
│   │   ├── ready.js            # Bot起動時処理
│   │   ├── voiceStateUpdate.js # VC入退室監視
│   │   └── interactionCreate.js# コマンド・ボタンインタラクション
│   ├── handlers/               # ビジネスロジック
│   │   ├── vcPoint.js          # VCポイント付与・ガチャ券発行
│   │   ├── gacha.js            # ガチャ抽選ロジック
│   │   ├── gamble.js           # ギャンブル抽選ロジック
│   │   ├── economy.js          # 送金・残高操作・ポイントログ
│   │   ├── ranking.js          # ランキング集計・投稿・リセット
│   │   ├── shop.js             # ショップ購入処理
│   │   └── panel.js            # 統合パネル生成・送信
│   └── utils/
│       ├── logger.js           # P変動ログ送信
│       ├── scheduler.js        # 月次リセットスケジューラ
│       └── permissions.js      # 管理者権限チェック
└── spec/
    ├── Requirements.md
    ├── Design.md
    └── Task.md
```

---

## 技術スタック

| 項目 | 採用技術 | バージョン目安 |
|------|----------|----------------|
| ランタイム | Node.js | 20 LTS |
| Discordライブラリ | discord.js | v14 |
| DBドライバ | better-sqlite3 | 最新安定版 |
| 設定管理 | dotenv | 最新安定版 |
| スケジューラ | node-cron | 最新安定版 |
| タイムゾーン | dayjs + dayjs/plugin/timezone + dayjs/plugin/utc | 最新安定版 |

---

## データベーススキーマ（SQLite）

### `users` テーブル
| カラム | 型 | 説明 |
|--------|----|------|
| `user_id` | TEXT PRIMARY KEY | DiscordユーザーID |
| `balance` | INTEGER DEFAULT 0 | 現在のP残高 |
| `gacha_tickets` | INTEGER DEFAULT 0 | ガチャ券枚数 |
| `total_vc_minutes` | INTEGER DEFAULT 0 | 累計VC滞在分（全期間） |
| `weekly_vc_minutes` | INTEGER DEFAULT 0 | 今週のVC滞在分 |
| `monthly_vc_minutes` | INTEGER DEFAULT 0 | 今月のVC滞在分 |
| `vc_join_time` | INTEGER DEFAULT NULL | 現在のVC参加開始UNIXタイム（ms） |
| `ticket_accum_minutes` | INTEGER DEFAULT 0 | ガチャ券発行用の未精算分（分） |

### `guild_settings` テーブル
| カラム | 型 | 説明 |
|--------|----|------|
| `guild_id` | TEXT PRIMARY KEY | DiscordサーバーID |
| `ranking_channel_id` | TEXT | 月間ランキング自動投稿チャンネル |
| `result_channel_id` | TEXT | ガチャ・ギャンブル結果通知チャンネル |
| `log_channel_id` | TEXT | P変動ログチャンネル |
| `panel_message_id` | TEXT | 統合パネルのメッセージID（再送時の削除用） |
| `panel_channel_id` | TEXT | 統合パネルのチャンネルID |

### `excluded_categories` テーブル
| カラム | 型 | 説明 |
|--------|----|------|
| `guild_id` | TEXT | サーバーID |
| `category_id` | TEXT | 除外カテゴリID |
| PRIMARY KEY | (guild_id, category_id) | |

### `shop_items` テーブル
| カラム | 型 | 説明 |
|--------|----|------|
| `item_id` | INTEGER PRIMARY KEY AUTOINCREMENT | 商品ID |
| `guild_id` | TEXT | サーバーID |
| `name` | TEXT | 商品名 |
| `price` | INTEGER | 価格（P） |
| `role_id` | TEXT | 付与するロールID |

### `point_logs` テーブル
| カラム | 型 | 説明 |
|--------|----|------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | ログID |
| `guild_id` | TEXT | サーバーID |
| `user_id` | TEXT | 対象ユーザーID |
| `delta` | INTEGER | 変動量（正=増加、負=減少） |
| `balance_after` | INTEGER | 変動後残高 |
| `reason` | TEXT | 変動理由（例: "VC付与", "ガチャ1等", "送金"など） |
| `created_at` | INTEGER | UNIXタイム（ms） |

---

## 主要な処理フロー

### VCポイント付与・ガチャ券発行

```
voiceStateUpdate イベント
  ├─ 入室時
  │   ├─ Botアカウント → スキップ
  │   ├─ 除外カテゴリ → スキップ
  │   └─ users.vc_join_time = Date.now() を記録
  └─ 退室時 / チャンネル移動時
      ├─ 経過分 = (Date.now() - vc_join_time) / 60000 (floor)
      ├─ balance += 経過分（1分=1P）
      ├─ weekly_vc_minutes += 経過分
      ├─ monthly_vc_minutes += 経過分
      ├─ ticket_accum_minutes += 経過分
      │   └─ ticket_accum_minutes >= 60 の間:
      │       gacha_tickets += 1
      │       ticket_accum_minutes -= 60
      ├─ vc_join_time = NULL（退室）or Date.now()（移動先）
      └─ P変動ログ送信（VC付与分）
```

> Bot再起動時: `vc_join_time` が NULL でないユーザーを対象に、起動時刻との差分で精算処理を行う（`ready.js` で実行）

### ガチャ抽選

```
パネルの「ガチャを引く」ボタン押下
  ├─ gacha_tickets < 1 → エラー返信（ephemeral）
  ├─ gacha_tickets -= 1
  ├─ 乱数で抽選（3/7/10/30/50%）
  ├─ balance += 当選P
  ├─ result_channel に結果Embed送信（全員可視）
  └─ P変動ログ送信
```

### ギャンブル抽選

```
パネルの「ギャンブルをする」ボタン押下
  ├─ balance < 100 → エラー返信（ephemeral）
  ├─ balance -= 100（掛け金）
  ├─ 乱数で抽選（0.001/20/10/0.001/44.998/15/10%）
  ├─ 全ロス時: balance = 0、result_channel に3ロールメンション付きで通知
  ├─ その他: balance += 当選P
  ├─ result_channel に結果Embed送信（全員可視）
  └─ P変動ログ送信
```

### 送金・請求

```
/pay @user <amount>
  ├─ 自分への送金 → エラー
  ├─ balance < amount → 残高不足エラー
  ├─ 送金元: balance -= amount
  ├─ 送金先: balance += amount
  └─ 両者のP変動ログ送信

/request @user <amount>
  ├─ 承認/拒否ボタン付きEmbedを送信
  ├─ 承認ボタン（対象ユーザーのみ操作可能）
  │   ├─ 承認者 balance < amount → 残高不足エラー（ephemeral）
  │   ├─ 承認者: balance -= amount
  │   ├─ 請求者: balance += amount
  │   └─ 両者のP変動ログ送信
  └─ 拒否ボタン → 拒否メッセージを表示してボタン無効化
```

### 月次ランキングリセット

```
node-cron: 毎月末 23:59（Asia/Tokyo）
  └─ ランキング内容を ranking_channel に投稿（上位10名）

node-cron: 毎月1日 00:01（Asia/Tokyo）
  └─ 全ユーザーの monthly_vc_minutes = 0 にリセット
  └─ weekly_vc_minutes は毎週月曜 00:01（Asia/Tokyo）にリセット
```

---

## コマンド一覧と実装対応

### ユーザーコマンド

| コマンド | ファイル | 説明 |
|----------|----------|------|
| `/balance` | `commands/balance.js` | P残高表示 |
| `/status` | `commands/status.js` | ガチャ券・P・今週VC時間 |
| `/ranking` | `commands/ranking.js` | 今月のVCランキング |
| `/pay` | `commands/pay.js` | 送金 |
| `/request` | `commands/request.js` | 請求（ボタン付き） |
| `/shop` | `commands/shop.js` | ショップ一覧 |
| `/buy` | `commands/buy.js` | 商品購入 |

### 管理者コマンド（/admin サブコマンド）

| サブコマンド | 説明 |
|-------------|------|
| `setchannel ranking` | ランキング投稿チャンネル設定 |
| `setchannel result` | ガチャ・ギャンブル結果チャンネル設定 |
| `setchannel log` | P変動ログチャンネル設定 |
| `gacha panel` | 統合パネル設置 |
| `addexclude` | 除外カテゴリ追加 |
| `removeexclude` | 除外カテゴリ解除 |
| `listexclude` | 除外カテゴリ一覧 |
| `give` | P付与 |
| `take` | P徴収 |
| `addshopitem` | ショップ商品追加 |
| `removeshopitem` | ショップ商品削除 |
| `resetranking` | 月間ランキング手動リセット |
| `resetusers` | 全ユーザーデータを初期値にリセット（確認ボタン付き） |

---

## `/admin resetusers` 処理フロー

```
/admin resetusers 実行
  ├─ 確認ボタン（「✅ リセット実行」「❌ キャンセル」）付きEmbedを ephemeral で表示
  ├─ 「✅ リセット実行」押下
  │   ├─ resetAllUsers() を呼び出す
  │   │   └─ UPDATE users SET balance=0, gacha_tickets=0,
  │   │          total_vc_minutes=0, weekly_vc_minutes=0,
  │   │          monthly_vc_minutes=0, ticket_accum_minutes=0,
  │   │          vc_join_time=NULL
  │   └─ 完了メッセージを ephemeral で更新
  └─ 「❌ キャンセル」押下
      └─ キャンセルメッセージを ephemeral で更新
```

- ボタンの `customId`: `resetusers_confirm` / `resetusers_cancel`
- ボタン操作者が元のコマンド実行者と一致するか `interaction.user.id` で検証する
- 確認ボタンはコマンド実行者のみ操作可能（他の管理者が誤って押せないようにする）

---

## 統合パネル設計

- `ActionRow` を2つ使用し、1行目に「🎰 ガチャを引く」、2行目に「🎲 ギャンブルをする（100P）」ボタンを配置
- ボタンの `customId`: `gacha_pull` / `gamble_play`
- パネルのメッセージIDを `guild_settings.panel_message_id` に保存し、再設置時に前のパネルを削除する

---

## P変動ログ形式（Embed）

```
[P変動ログ]
ユーザー: @xxx
変動量:   +50P
残高:     350P
要因:     ガチャ4等
日時:     2026/04/29 12:34:56
```

---

## セキュリティ設計

- `.env` に `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` を格納し `.gitignore` で除外
- 管理者コマンドは `interaction.memberPermissions.has('Administrator')` で必ずサーバー側チェックを行う
- ボタンインタラクションの `/request` 承認・拒否は `interaction.user.id === targetUserId` で操作者を検証する
- SQLクエリはすべてプリペアドステートメントを使用し SQLインジェクションを防ぐ

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-04-29 | 初版作成 |
| 2026-04-29 | タイムゾーン設計を追加（JST固定）、node-cronにAsia/Tokyo指定を明記 |
| 2026-04-30 | `/admin resetusers` コマンドの設計を追加（全ユーザーデータ初期化、確認ボタン付き） |
