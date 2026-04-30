'use strict';

const { getUser, updateUser } = require('../database');
const { sendPointLog } = require('../utils/logger');

/**
 * ユーザーのPを増減させ、ログを送信する
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {string} userId
 * @param {number} delta      変動量（正=増加、負=減少）
 * @param {string} reason
 * @returns {number} 変動後の残高
 */
async function changeBalance(client, guildId, userId, delta, reason) {
  const user = getUser(userId);
  const newBalance = Math.max(0, user.balance + delta);
  updateUser(userId, { balance: newBalance });
  await sendPointLog(client, guildId, userId, delta, newBalance, reason);
  return newBalance;
}

/**
 * 送金処理（送金元 → 送金先）
 * @returns {{ success: boolean, reason?: string }}
 */
async function transfer(client, guildId, fromId, toId, amount) {
  const from = getUser(fromId);
  if (from.balance < amount) {
    return { success: false, reason: '残高不足' };
  }

  const newFromBalance = from.balance - amount;
  updateUser(fromId, { balance: newFromBalance });
  await sendPointLog(client, guildId, fromId, -amount, newFromBalance, `送金 → <@${toId}>`);

  const to = getUser(toId);
  const newToBalance = to.balance + amount;
  updateUser(toId, { balance: newToBalance });
  await sendPointLog(client, guildId, toId, amount, newToBalance, `送金受取 ← <@${fromId}>`);

  return { success: true };
}

module.exports = { changeBalance, transfer };
