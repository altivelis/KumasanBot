'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../database');

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('ガチャ券枚数・P残高・今週のVC滞在時間を表示します'),
  async execute(interaction) {
    const user = getUser(interaction.user.id);
    const embed = new EmbedBuilder()
      .setTitle('📊 ステータス')
      .setColor(0x3498db)
      .setDescription(`<@${interaction.user.id}> のステータス`)
      .addFields(
        { name: '💰 残高', value: `${user.balance}P`, inline: true },
        { name: '🎟️ ガチャ券', value: `${user.gacha_tickets}枚`, inline: true },
        { name: '🎙️ 今週のVC滞在時間', value: formatTime(user.weekly_vc_minutes), inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  },
};
