'use strict';

const { EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
const { addPointLog, getGuildSettings } = require('../database');

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * P変動をDBに記録し、ログチャンネルにEmbedを送信する
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {string} userId
 * @param {number} delta      変動量（正=増加、負=減少）
 * @param {number} balanceAfter 変動後残高
 * @param {string} reason     変動理由
 */
async function sendPointLog(client, guildId, userId, delta, balanceAfter, reason) {
  addPointLog(guildId, userId, delta, balanceAfter, reason);

  const settings = getGuildSettings(guildId);
  if (!settings.log_channel_id) return;

  const channel = await client.channels.fetch(settings.log_channel_id).catch(() => null);
  if (!channel) return;

  const sign = delta >= 0 ? '+' : '';
  const color = delta >= 0 ? 0x57f287 : 0xed4245;
  const now = dayjs().tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm:ss');

  const embed = new EmbedBuilder()
    .setTitle('💰 P変動ログ')
    .setColor(color)
    .addFields(
      { name: 'ユーザー', value: `<@${userId}>`, inline: true },
      { name: '変動量', value: `${sign}${delta}P`, inline: true },
      { name: '残高', value: `${balanceAfter}P`, inline: true },
      { name: '要因', value: reason, inline: false },
      { name: '日時', value: now, inline: false }
    );

  await channel.send({ embeds: [embed] }).catch(console.error);
}

module.exports = { sendPointLog };
