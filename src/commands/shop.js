'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { buildShopEmbed } = require('../handlers/shop');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('ショップの商品一覧を表示します'),
  async execute(interaction) {
    const embed = buildShopEmbed(interaction.guildId);
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
