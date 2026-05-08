'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../config/gamble.config.json');

/**
 * ギャンブル設定をファイルから読み込む（毎回再読み込みして設定変更を即反映）
 */
function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw);
}

/**
 * ギャンブル抽選ロジック（確率は config/gamble.config.json で管理）
 * @returns {{ result: string, points: number, isFullLoss: boolean }}
 */
function playGamble() {
  const { outcomes } = loadConfig();

  // 確率の合計値を基準にランダム値を生成（合計が100でなくても正しく動作する）
  const total = outcomes.reduce((sum, o) => sum + o.probability, 0);
  const rand = Math.random() * total;

  let cumulative = 0;
  for (const outcome of outcomes) {
    cumulative += outcome.probability;
    if (rand < cumulative) {
      return {
        result: `${outcome.emoji} ${outcome.label}`,
        points: outcome.points,
        isFullLoss: outcome.isFullLoss ?? false,
      };
    }
  }

  // フォールバック（浮動小数点誤差対策）
  const last = outcomes[outcomes.length - 1];
  return {
    result: `${last.emoji} ${last.label}`,
    points: last.points,
    isFullLoss: last.isFullLoss ?? false,
  };
}

module.exports = { playGamble };
