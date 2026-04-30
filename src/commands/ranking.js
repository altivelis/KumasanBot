'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { buildRankingEmbed } = require('../handlers/ranking');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('今月のVC滞在時間ランキングを表示します'),
  async execute(interaction) {
    const embed = await buildRankingEmbed(interaction.client, interaction.guildId);
    await interaction.reply({ embeds: [embed] });
  },
};
