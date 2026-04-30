'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('現在のP残高を表示します'),
  async execute(interaction) {
    const user = getUser(interaction.user.id);
    const embed = new EmbedBuilder()
      .setTitle('💰 残高')
      .setColor(0xf1c40f)
      .setDescription(`<@${interaction.user.id}> の現在の残高は **${user.balance}P** です`);
    await interaction.reply({ embeds: [embed] });
  },
};
