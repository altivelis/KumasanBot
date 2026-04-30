'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * ガチャ＋ギャンブル統合パネルを生成して送信する
 * @param {import('discord.js').TextChannel} channel
 * @param {string} guildId
 * @param {import('../database')} db
 * @returns {Promise<import('discord.js').Message>}
 */
async function sendPanel(channel, guildId, dbModule) {
  const { getGuildSettings, setGuildSetting } = dbModule;

  // 既存パネルを削除
  const settings = getGuildSettings(guildId);
  if (settings.panel_message_id && settings.panel_channel_id) {
    const oldChannel = await channel.client.channels.fetch(settings.panel_channel_id).catch(() => null);
    if (oldChannel) {
      const oldMsg = await oldChannel.messages.fetch(settings.panel_message_id).catch(() => null);
      if (oldMsg) await oldMsg.delete().catch(() => null);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('🎰 ガチャ & ギャンブル')
    .setColor(0x9b59b6)
    .addFields(
      {
        name: '🎟️ ガチャ',
        value: [
          '**ガチャ券1枚消費**',
          '🥇 1等 500P … 3%',
          '🥈 2等 300P … 7%',
          '🥉 3等 100P … 10%',
          '4等 50P … 30%',
          'はずれ 10P … 50%',
        ].join('\n'),
        inline: true,
      },
      {
        name: '🎲 ギャンブル',
        value: [
          '**100P消費（返還なし）**',
          '🎉 大当たり 3000P … 0.001%',
          '🎊 当たり 800P … 10%',
          '🎊 当たり 500P … 20%',
          '✨ 小当たり 10P … 10%',
          '✨ 小当たり 5P … 15%',
          '😢 はずれ 0P … 44.998%',
          '💀 全ロス 0P … 0.001%',
        ].join('\n'),
        inline: true,
      }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('gacha_pull')
      .setLabel('🎟️ ガチャを引く')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('gamble_play')
      .setLabel('🎲 ギャンブルをする（100P）')
      .setStyle(ButtonStyle.Danger)
  );

  const msg = await channel.send({ embeds: [embed], components: [row] });

  setGuildSetting(guildId, 'panel_message_id', msg.id);
  setGuildSetting(guildId, 'panel_channel_id', channel.id);

  return msg;
}

module.exports = { sendPanel };
