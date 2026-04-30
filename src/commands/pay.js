'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { transfer } = require('../handlers/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('指定ユーザーにPを送金します')
    .addUserOption(opt =>
      opt.setName('user').setDescription('送金先ユーザー').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('送金額（1以上）').setMinValue(1).setRequired(true)
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '自分自身には送金できません。', ephemeral: true });
    }
    if (target.bot) {
      return interaction.reply({ content: 'Botには送金できません。', ephemeral: true });
    }

    const result = await transfer(
      interaction.client,
      interaction.guildId,
      interaction.user.id,
      target.id,
      amount
    );

    if (!result.success) {
      return interaction.reply({ content: `❌ 残高不足のため送金できません。`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('💸 送金完了')
      .setColor(0x2ecc71)
      .setDescription(`<@${interaction.user.id}> → <@${target.id}> へ **${amount}P** を送金しました`);

    await interaction.reply({ embeds: [embed] });
  },
};
