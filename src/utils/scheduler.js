'use strict';

const cron = require('node-cron');
const { resetWeeklyVc } = require('../database');
const { postAndResetRanking } = require('../handlers/ranking');

const TZ = 'Asia/Tokyo';

/**
 * スケジューラを起動する
 * @param {import('discord.js').Client} client
 */
function startScheduler(client) {
  // 月末 23:59 JST にランキング投稿
  // node-cron は L 修飾子未対応のため 28-31 日に発火し、翌日が1日か確認する
  cron.schedule('59 23 28-31 * *', async () => {
    // JST での現在日付を取得（サーバーのローカルTZに依存しない）
    const nowJST = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
    const tomorrowJST = new Date(nowJST);
    tomorrowJST.setDate(nowJST.getDate() + 1);
    if (tomorrowJST.getDate() === 1) {
      await postAndResetRanking(client);
    }
  }, { timezone: TZ });

  // 毎月1日 00:01 JST にランキングリセット（投稿はすでに月末に済んでいる）
  cron.schedule('1 0 1 * *', () => {
    resetWeeklyVc(); // 月初にweeklyもリセット（週次とは別）
  }, { timezone: TZ });

  // 毎週月曜 00:01 JST に週次VCリセット
  cron.schedule('1 0 * * 1', () => {
    resetWeeklyVc();
  }, { timezone: TZ });

  console.log('⏰ スケジューラ起動（タイムゾーン: Asia/Tokyo）');
}

module.exports = { startScheduler };
