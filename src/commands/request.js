'use strict';

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser } = require('../database');
const { transfer } = require('../handlers/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('request')
    .setDescription('指定ユーザーにPを請求します')
    .addUserOption(opt =>
      opt.setName('user').setDescription('請求先ユーザー').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('請求額（1以上）').setMinValue(1).setRequired(true)
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '自分自身には請求できません。', ephemeral: true });
    }
    if (target.bot) {
      return interaction.reply({ content: 'Botには請求できません。', ephemeral: true });
    }

    const requesterId = interaction.user.id;
    const targetId = target.id;

    const embed = new EmbedBuilder()
      .setTitle('📨 P請求')
      .setColor(0xe67e22)
      .setDescription(
        `<@${requesterId}> が <@${targetId}> に **${amount}P** を請求しています。\n<@${targetId}> は承認または拒否してください。`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`request_approve:${requesterId}:${targetId}:${amount}`)
        .setLabel('承認')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`request_deny:${requesterId}:${targetId}`)
        .setLabel('拒否')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
