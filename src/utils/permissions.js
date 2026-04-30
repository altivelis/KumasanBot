'use strict';

/**
 * 管理者権限（Administrator）を保持しているか確認する
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
function isAdmin(member) {
  return member.permissions.has('Administrator');
}

module.exports = { isAdmin };
