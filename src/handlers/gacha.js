'use strict';

/**
 * ガチャ抽選ロジック
 * 確率: 1等3% / 2等7% / 3等10% / 4等30% / はずれ50%
 * @returns {{ grade: string, points: number }}
 */
function drawGacha() {
  const rand = Math.random() * 100;
  if (rand < 3) return { grade: '🥇 1等', points: 500 };
  if (rand < 10) return { grade: '🥈 2等', points: 300 };
  if (rand < 20) return { grade: '🥉 3等', points: 100 };
  if (rand < 50) return { grade: '4等', points: 50 };
  return { grade: 'はずれ', points: 10 };
}

module.exports = { drawGacha };
