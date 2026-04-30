'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getShopItems, getShopItem, getUser, updateUser } = require('../database');
const { changeBalance } = require('./economy');

/**
 * ショップ一覧Embedを生成する
 */
function buildShopEmbed(guildId) {
  const items = getShopItems(guildId);
  const embed = new EmbedBuilder()
    .setTitle('🛒 ショップ')
    .setColor(0x1abc9c);

  if (items.length === 0) {
    embed.setDescription('現在販売中の商品はありません。');
    return embed;
  }

  const lines = items.map(it => `**[${it.item_id}]** ${it.name} — ${it.price}P`);
  embed.setDescription(lines.join('\n'));
  embed.setFooter({ text: '/buy <商品ID> で購入できます' });
  return embed;
}

/**
 * 商品を購入する
 * @returns {{ success: boolean, message: string }}
 */
async function purchaseItem(client, guildId, userId, itemId, member) {
  const item = getShopItem(itemId, guildId);
  if (!item) return { success: false, message: '指定された商品が見つかりません。' };

  const user = getUser(userId);
  if (user.balance < item.price) {
    return { success: false, message: `残高不足です。必要: ${item.price}P / 現在: ${user.balance}P` };
  }

  // ロール付与
  const role = member.guild.roles.cache.get(item.role_id);
  if (!role) return { success: false, message: 'ロールが見つかりません。管理者に連絡してください。' };

  await member.roles.add(role).catch(() => null);
  await changeBalance(client, guildId, userId, -item.price, `ショップ購入: ${item.name}`);

  return { success: true, message: `✅ **${item.name}** を購入しました！ロール <@&${role.id}> が付与されました。` };
}

module.exports = { buildShopEmbed, purchaseItem };
