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
  // L（last）修飾子で月の最終日のみ発火させる
  cron.schedule('59 23 L * *', async () => {
    await postAndResetRanking(client);
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
