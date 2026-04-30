'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { purchaseItem } = require('../handlers/shop');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('ショップの商品を購入します')
    .addIntegerOption(opt =>
      opt.setName('item_id').setDescription('商品ID').setRequired(true).setMinValue(1)
    ),
  async execute(interaction) {
    const itemId = interaction.options.getInteger('item_id');
    const result = await purchaseItem(
      interaction.client,
      interaction.guildId,
      interaction.user.id,
      itemId,
      interaction.member
    );
    await interaction.reply({ content: result.message, ephemeral: !result.success });
  },
};
