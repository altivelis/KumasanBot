'use strict';

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'kumasanbot.db'));

// WALモードで書き込みパフォーマンス向上
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id              TEXT PRIMARY KEY,
    balance              INTEGER NOT NULL DEFAULT 0,
    gacha_tickets        INTEGER NOT NULL DEFAULT 0,
    total_vc_minutes     INTEGER NOT NULL DEFAULT 0,
    weekly_vc_minutes    INTEGER NOT NULL DEFAULT 0,
    monthly_vc_minutes   INTEGER NOT NULL DEFAULT 0,
    vc_join_time         INTEGER,
    ticket_accum_minutes INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id           TEXT PRIMARY KEY,
    ranking_channel_id TEXT,
    result_channel_id  TEXT,
    log_channel_id     TEXT,
    panel_message_id   TEXT,
    panel_channel_id   TEXT
  );

  CREATE TABLE IF NOT EXISTS excluded_categories (
    guild_id    TEXT NOT NULL,
    category_id TEXT NOT NULL,
    PRIMARY KEY (guild_id, category_id)
  );

  CREATE TABLE IF NOT EXISTS shop_items (
    item_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT    NOT NULL,
    name     TEXT    NOT NULL,
    price    INTEGER NOT NULL,
    role_id  TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS point_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id      TEXT    NOT NULL,
    user_id       TEXT    NOT NULL,
    delta         INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reason        TEXT    NOT NULL,
    created_at    INTEGER NOT NULL
  );
`);

// ---- ユーザー ----

function getUser(userId) {
  let user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  if (!user) {
    db.prepare('INSERT INTO users (user_id) VALUES (?)').run(userId);
    user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  }
  return user;
}

function updateUser(userId, fields) {
  const keys = Object.keys(fields);
  const set = keys.map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE users SET ${set} WHERE user_id = ?`).run(...keys.map(k => fields[k]), userId);
}

function getAllActiveVcUsers() {
  return db.prepare('SELECT * FROM users WHERE vc_join_time IS NOT NULL').all();
}

function resetWeeklyVc() {
  db.prepare('UPDATE users SET weekly_vc_minutes = 0').run();
}

function resetMonthlyVc() {
  db.prepare('UPDATE users SET monthly_vc_minutes = 0').run();
}

function resetAllUsers() {
  db.prepare(`
    UPDATE users SET
      balance = 0,
      gacha_tickets = 0,
      total_vc_minutes = 0,
      weekly_vc_minutes = 0,
      monthly_vc_minutes = 0,
      ticket_accum_minutes = 0,
      vc_join_time = NULL
  `).run();
}

function getMonthlyRanking(limit = 10) {
  return db
    .prepare('SELECT user_id, monthly_vc_minutes FROM users ORDER BY monthly_vc_minutes DESC LIMIT ?')
    .all(limit);
}

// ---- ギルド設定 ----

function getGuildSettings(guildId) {
  let s = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
  if (!s) {
    db.prepare('INSERT INTO guild_settings (guild_id) VALUES (?)').run(guildId);
    s = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
  }
  return s;
}

function setGuildSetting(guildId, field, value) {
  getGuildSettings(guildId); // 行が確実に存在するよう初期化
  db.prepare(`UPDATE guild_settings SET ${field} = ? WHERE guild_id = ?`).run(value, guildId);
}

// ---- 除外カテゴリ ----

function addExcludedCategory(guildId, categoryId) {
  db.prepare('INSERT OR IGNORE INTO excluded_categories (guild_id, category_id) VALUES (?, ?)').run(guildId, categoryId);
}

function removeExcludedCategory(guildId, categoryId) {
  db.prepare('DELETE FROM excluded_categories WHERE guild_id = ? AND category_id = ?').run(guildId, categoryId);
}

function getExcludedCategories(guildId) {
  return db.prepare('SELECT category_id FROM excluded_categories WHERE guild_id = ?').all(guildId).map(r => r.category_id);
}

// ---- ショップ ----

function getShopItems(guildId) {
  return db.prepare('SELECT * FROM shop_items WHERE guild_id = ?').all(guildId);
}

function getShopItem(itemId, guildId) {
  return db.prepare('SELECT * FROM shop_items WHERE item_id = ? AND guild_id = ?').get(itemId, guildId);
}

function addShopItem(guildId, name, price, roleId) {
  return db.prepare('INSERT INTO shop_items (guild_id, name, price, role_id) VALUES (?, ?, ?, ?)').run(guildId, name, price, roleId);
}

function removeShopItem(itemId, guildId) {
  return db.prepare('DELETE FROM shop_items WHERE item_id = ? AND guild_id = ?').run(itemId, guildId);
}

// ---- ポイントログ ----

function addPointLog(guildId, userId, delta, balanceAfter, reason) {
  db.prepare(
    'INSERT INTO point_logs (guild_id, user_id, delta, balance_after, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(guildId, userId, delta, balanceAfter, reason, Date.now());
}

module.exports = {
  db,
  getUser,
  updateUser,
  getAllActiveVcUsers,
  resetWeeklyVc,
  resetMonthlyVc,
  resetAllUsers,
  getMonthlyRanking,
  getGuildSettings,
  setGuildSetting,
  addExcludedCategory,
  removeExcludedCategory,
  getExcludedCategories,
  getShopItems,
  getShopItem,
  addShopItem,
  removeShopItem,
  addPointLog,
};
