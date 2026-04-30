'use strict';

const { EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
const { getMonthlyRanking, resetMonthlyVc, getGuildSettings } = require('../database');

dayjs.extend(utc);
dayjs.extend(timezone);

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

/**
 * 月間ランキングEmbedを生成する
 */
async function buildRankingEmbed(client, guildId) {
  const records = getMonthlyRanking(10);
  const now = dayjs().tz('Asia/Tokyo').format('YYYY年MM月');

  const lines = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const medal = ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`;
    lines.push(`${medal} <@${r.user_id}> — ${formatTime(r.monthly_vc_minutes)}`);
  }

  return new EmbedBuilder()
    .setTitle(`🏆 ${now} VCランキング`)
    .setColor(0xf39c12)
    .setDescription(lines.length > 0 ? lines.join('\n') : 'まだ記録がありません');
}

/**
 * ランキングチャンネルに投稿してリセットする
 */
async function postAndResetRanking(client) {
  for (const guild of client.guilds.cache.values()) {
    const settings = getGuildSettings(guild.id);
    if (!settings.ranking_channel_id) continue;

    const channel = await client.channels.fetch(settings.ranking_channel_id).catch(() => null);
    if (!channel) continue;

    const embed = await buildRankingEmbed(client, guild.id);
    await channel.send({ embeds: [embed] }).catch(console.error);
  }

  resetMonthlyVc();
}

module.exports = { buildRankingEmbed, postAndResetRanking };
