'use strict';

const { Events, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUser, updateUser, getGuildSettings, resetAllUsers } = require('../database');
const { drawGacha } = require('../handlers/gacha');
const { playGamble } = require('../handlers/gamble');
const { changeBalance, transfer } = require('../handlers/economy');

// 全ロス告知用ロールID
const FULL_LOSS_ROLE_IDS = [
  '1469319867294417051',
  '1469319364300898305',
  '1469335516036989140',
];

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // スラッシュコマンド
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(err);
        const msg = { content: '❌ エラーが発生しました。', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => null);
        } else {
          await interaction.reply(msg).catch(() => null);
        }
      }
      return;
    }

    // ボタン
    if (interaction.isButton()) {
      const { customId, guildId, user } = interaction;

      // ---- ガチャ ----
      if (customId === 'gacha_pull') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const userData = getUser(user.id);
        if (userData.gacha_tickets < 1) {
          return interaction.editReply({ content: '❌ ガチャ券が足りません。' });
        }

        updateUser(user.id, { gacha_tickets: userData.gacha_tickets - 1 });
        const { grade, points } = drawGacha();
        await changeBalance(client, guildId, user.id, points, `ガチャ ${grade}`);

        const settings = getGuildSettings(guildId);
        const color = points >= 300 ? 0xf1c40f : points >= 100 ? 0x3498db : 0x95a5a6;
        const embed = new EmbedBuilder()
          .setTitle('🎟️ ガチャ結果')
          .setColor(color)
          .setDescription(`<@${user.id}> が **${grade}** を引きました！\n獲得: **${points}P**`);

        if (settings.result_channel_id) {
          const resultCh = await client.channels.fetch(settings.result_channel_id).catch(() => null);
          if (resultCh) await resultCh.send({ embeds: [embed] }).catch(console.error);
          await interaction.editReply({ content: `✅ ${grade} — ${points}P 獲得！` });
        } else {
          await interaction.editReply({ embeds: [embed] });
        }
        return;
      }

      // ---- ギャンブル ----
      if (customId === 'gamble_play') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const userData = getUser(user.id);
        if (userData.balance < 100) {
          return interaction.editReply({ content: '❌ 残高が100P未満のためギャンブルできません。' });
        }

        // 掛け金を先に引く
        updateUser(user.id, { balance: userData.balance - 100 });

        const { result, points, isFullLoss } = playGamble();
        const settings = getGuildSettings(guildId);

        let newBalance;
        if (isFullLoss) {
          // 全ロス: 残高を0に
          const current = getUser(user.id).balance;
          updateUser(user.id, { balance: 0 });
          await changeBalance(client, guildId, user.id, -(current + 100), 'ギャンブル 全ロス').catch(() => null);
          newBalance = 0;
        } else {
          newBalance = await changeBalance(client, guildId, user.id, points, `ギャンブル ${result}`);
        }

        const color = isFullLoss ? 0xe74c3c : points >= 800 ? 0xf1c40f : points > 0 ? 0x2ecc71 : 0x95a5a6;
        const embed = new EmbedBuilder()
          .setTitle('🎲 ギャンブル結果')
          .setColor(color)
          .setDescription(
            isFullLoss
              ? `${FULL_LOSS_ROLE_IDS.map(id => `<@&${id}>`).join(' ')}\n💀 <@${user.id}> が **全ロス** しました！残高が0になりました...`
              : `<@${user.id}> の結果: **${result}**\n${points > 0 ? `獲得: **${points}P**` : '獲得なし'}`
          );

        if (settings.result_channel_id) {
          const resultCh = await client.channels.fetch(settings.result_channel_id).catch(() => null);
          if (resultCh) await resultCh.send({ embeds: [embed] }).catch(console.error);
          await interaction.editReply({ content: isFullLoss ? '💀 全ロス...' : `✅ ${result}` });
        } else {
          await interaction.editReply({ embeds: [embed] });
        }
        return;
      }

      // ---- 請求承認 ----
      if (customId.startsWith('request_approve:')) {
        const [, requesterId, targetId, amountStr] = customId.split(':');
        const amount = parseInt(amountStr, 10);

        // 操作できるのは targetId のみ
        if (user.id !== targetId) {
          return interaction.reply({ content: '❌ この操作はあなたには許可されていません。', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferUpdate();
        const result = await transfer(client, guildId, targetId, requesterId, amount);
        if (!result.success) {
          return interaction.followUp({ content: '❌ 残高不足のため承認できません。', flags: MessageFlags.Ephemeral });
        }

        const embed = new EmbedBuilder()
          .setTitle('✅ 請求承認')
          .setColor(0x2ecc71)
          .setDescription(`<@${targetId}> が <@${requesterId}> への **${amount}P** 請求を承認しました`);

        await interaction.editReply({ embeds: [embed], components: [] });
        return;
      }

      // ---- 請求拒否 ----
      if (customId.startsWith('request_deny:')) {
        const [, requesterId, targetId] = customId.split(':');
        if (user.id !== targetId) {
          return interaction.reply({ content: '❌ この操作はあなたには許可されていません。', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferUpdate();
        const embed = new EmbedBuilder()
          .setTitle('❌ 請求拒否')
          .setColor(0xe74c3c)
          .setDescription(`<@${targetId}> が <@${requesterId}> への請求を拒否しました`);

        await interaction.editReply({ embeds: [embed], components: [] });
        return;
      }

      // ---- usersリセット確認 ----
      if (customId.startsWith('resetusers_confirm:')) {
        const [, executorId] = customId.split(':');
        if (user.id !== executorId) {
          return interaction.reply({ content: '❌ この操作はあなたには許可されていません。', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferUpdate();
        resetAllUsers();
        await interaction.editReply({ content: '✅ 全ユーザーデータを初期値にリセットしました。', embeds: [], components: [] });
        return;
      }

      // ---- usersリセットキャンセル ----
      if (customId.startsWith('resetusers_cancel:')) {
        const [, executorId] = customId.split(':');
        if (user.id !== executorId) {
          return interaction.reply({ content: '❌ この操作はあなたには許可されていません。', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferUpdate();
        await interaction.editReply({ content: '❌ リセットをキャンセルしました。', embeds: [], components: [] });
        return;
      }
    }
  },
};
