'use strict';

const { Events } = require('discord.js');
const { getAllActiveVcUsers, updateUser, getExcludedCategories } = require('../database');
const { settleVcTime } = require('../handlers/vcPoint');
const { startScheduler } = require('../utils/scheduler');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ ${client.user.tag} でログイン成功`);

    // Bot再起動時: vc_join_time が残っているユーザーを精算
    const activeUsers = getAllActiveVcUsers();
    for (const user of activeUsers) {
      // VCに実際にいるかチェック
      let stillInVc = false;
      for (const guild of client.guilds.cache.values()) {
        const excluded = getExcludedCategories(guild.id);
        const member = guild.members.cache.get(user.user_id);
        if (member?.voice?.channelId) {
          const categoryId = member.voice.channel?.parentId;
          if (!categoryId || !excluded.includes(categoryId)) {
            stillInVc = true;
            // 再起動時刻を新たな参加時刻として記録
            updateUser(user.user_id, { vc_join_time: Date.now() });
          }
        }
      }
      if (!stillInVc) {
        // VCを抜けていた場合は精算
        const guildId = client.guilds.cache.first()?.id;
        if (guildId) {
          await settleVcTime(client, guildId, user.user_id, user.vc_join_time);
        } else {
          updateUser(user.user_id, { vc_join_time: null });
        }
      }
    }

    startScheduler(client);
  },
};
