'use strict';

const { getUser, updateUser, getExcludedCategories } = require('../database');
const { changeBalance } = require('../handlers/economy');

/**
 * VC退室 / 移動時にポイントとガチャ券を精算する
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {string} userId
 * @param {number} joinTime  vc_join_time（ms）
 */
async function settleVcTime(client, guildId, userId, joinTime) {
  const elapsedMs = Date.now() - joinTime;
  const elapsedMin = Math.floor(elapsedMs / 60000);
  if (elapsedMin <= 0) return;

  const user = getUser(userId);

  // ガチャ券の発行
  const newAccum = user.ticket_accum_minutes + elapsedMin;
  const newTickets = user.gacha_tickets + Math.floor(newAccum / 60);
  const remainAccum = newAccum % 60;

  updateUser(userId, {
    weekly_vc_minutes: user.weekly_vc_minutes + elapsedMin,
    monthly_vc_minutes: user.monthly_vc_minutes + elapsedMin,
    total_vc_minutes: user.total_vc_minutes + elapsedMin,
    gacha_tickets: newTickets,
    ticket_accum_minutes: remainAccum,
    vc_join_time: null,
  });

  // Pを付与（1分=1P）
  await changeBalance(client, guildId, userId, elapsedMin, `VC滞在 ${elapsedMin}分`);
}

/**
 * voiceStateUpdate イベントの処理
 */
async function handleVoiceStateUpdate(oldState, newState, client) {
  const member = newState.member ?? oldState.member;
  // Botは対象外
  if (member.user.bot) return;

  const guildId = (newState.guild ?? oldState.guild).id;
  const userId = member.id;
  const excludedCategories = getExcludedCategories(guildId);

  const leftChannel = oldState.channelId && !newState.channelId;   // 退室
  const joined = !oldState.channelId && newState.channelId;        // 入室
  const moved = oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId; // 移動

  // 退室 or 移動（退室側）
  if (leftChannel || moved) {
    const user = getUser(userId);
    if (user.vc_join_time) {
      await settleVcTime(client, guildId, userId, user.vc_join_time);
    }
  }

  // 入室 or 移動（入室側）
  if (joined || moved) {
    const targetChannel = newState.channel;
    const categoryId = targetChannel?.parentId;

    if (categoryId && excludedCategories.includes(categoryId)) {
      // 除外カテゴリなので計測しない
      updateUser(userId, { vc_join_time: null });
      return;
    }
    updateUser(userId, { vc_join_time: Date.now() });
  }
}

module.exports = { handleVoiceStateUpdate, settleVcTime };
