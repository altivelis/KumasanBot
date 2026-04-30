'use strict';

/**
 * ギャンブル抽選ロジック
 * 確率合計 = 100%
 * @returns {{ result: string, points: number, isFullLoss: boolean }}
 */
function playGamble() {
  const rand = Math.random() * 100;

  // 大当たり 0.001%
  if (rand < 0.001) return { result: '🎉 大当たり！', points: 3000, isFullLoss: false };
  // 全ロス 0.001% (0.001 ～ 0.002)
  if (rand < 0.002) return { result: '💀 全ロス...', points: 0, isFullLoss: true };
  // 当たり② 10% (0.002 ～ 10.002)
  if (rand < 10.002) return { result: '🎊 当たり！ (800P)', points: 800, isFullLoss: false };
  // 当たり① 20% (10.002 ～ 30.002)
  if (rand < 30.002) return { result: '🎊 当たり！ (500P)', points: 500, isFullLoss: false };
  // 小当たり② 10% (30.002 ～ 40.002)
  if (rand < 40.002) return { result: '✨ 小当たり (10P)', points: 10, isFullLoss: false };
  // 小当たり① 15% (40.002 ～ 55.002)
  if (rand < 55.002) return { result: '✨ 小当たり (5P)', points: 5, isFullLoss: false };
  // はずれ 44.998% (55.002 ～ 100)
  return { result: '😢 はずれ', points: 0, isFullLoss: false };
}

module.exports = { playGamble };
