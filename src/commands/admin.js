'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const {
  setGuildSetting,
  addExcludedCategory,
  removeExcludedCategory,
  getExcludedCategories,
  getUser,
  addShopItem,
  removeShopItem,
  resetMonthlyVc,
  resetAllUsers,
} = require('../database');
const { changeBalance } = require('../handlers/economy');
const { sendPanel } = require('../handlers/panel');
const { postAndResetRanking } = require('../handlers/ranking');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('管理者専用コマンド')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // setchannel
    .addSubcommandGroup(group =>
      group
        .setName('setchannel')
        .setDescription('チャンネルを設定します')
        .addSubcommand(sub =>
          sub.setName('ranking').setDescription('月間ランキング投稿チャンネルを設定')
            .addChannelOption(o => o.setName('channel').setDescription('チャンネル').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('result').setDescription('ガチャ・ギャンブル結果通知チャンネルを設定')
            .addChannelOption(o => o.setName('channel').setDescription('チャンネル').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('log').setDescription('P変動ログチャンネルを設定')
            .addChannelOption(o => o.setName('channel').setDescription('チャンネル').setRequired(true))
        )
    )
    // gacha panel
    .addSubcommandGroup(group =>
      group
        .setName('gacha')
        .setDescription('ガチャ関連')
        .addSubcommand(sub =>
          sub.setName('panel').setDescription('ガチャ＋ギャンブル統合パネルをこのチャンネルに設置')
        )
    )
    // 除外カテゴリ
    .addSubcommand(sub =>
      sub.setName('addexclude').setDescription('ポイントカウント対象外カテゴリを追加')
        .addChannelOption(o =>
          o.setName('category').setDescription('除外するカテゴリ').setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory)
        )
    )
    .addSubcommand(sub =>
      sub.setName('removeexclude').setDescription('対象外カテゴリを解除')
        .addChannelOption(o =>
          o.setName('category').setDescription('解除するカテゴリ').setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory)
        )
    )
    .addSubcommand(sub =>
      sub.setName('listexclude').setDescription('対象外カテゴリ一覧を表示')
    )
    // P付与・徴収
    .addSubcommand(sub =>
      sub.setName('give').setDescription('指定ユーザーにPを付与')
        .addUserOption(o => o.setName('user').setDescription('対象ユーザー').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('付与額').setMinValue(1).setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('take').setDescription('指定ユーザーからPを徴収')
        .addUserOption(o => o.setName('user').setDescription('対象ユーザー').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('徴収額').setMinValue(1).setRequired(true))
    )
    // ショップ
    .addSubcommand(sub =>
      sub.setName('addshopitem').setDescription('ショップ商品を追加')
        .addStringOption(o => o.setName('name').setDescription('商品名').setRequired(true))
        .addIntegerOption(o => o.setName('price').setDescription('価格(P)').setMinValue(1).setRequired(true))
        .addRoleOption(o => o.setName('role').setDescription('付与するロール').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('removeshopitem').setDescription('ショップ商品を削除')
        .addIntegerOption(o => o.setName('item_id').setDescription('商品ID').setMinValue(1).setRequired(true))
    )
    // ランキングリセット
    .addSubcommand(sub =>
      sub.setName('resetranking').setDescription('月間ランキングを手動リセット（投稿してリセット）')
    )
    // usersテーブルリセット
    .addSubcommand(sub =>
      sub.setName('resetusers').setDescription('全ユーザーデータを初期値にリセット（残高・チケット・VC時間など）')
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    // --- setchannel ---
    if (group === 'setchannel') {
      const channel = interaction.options.getChannel('channel');
      const fieldMap = { ranking: 'ranking_channel_id', result: 'result_channel_id', log: 'log_channel_id' };
      setGuildSetting(interaction.guildId, fieldMap[sub], channel.id);
      return interaction.reply({ content: `✅ <#${channel.id}> を設定しました。`, flags: MessageFlags.Ephemeral });
    }

    // --- gacha panel ---
    if (group === 'gacha' && sub === 'panel') {
      await sendPanel(interaction.channel, interaction.guildId, db);
      return interaction.reply({ content: '✅ パネルを設置しました。', flags: MessageFlags.Ephemeral });
    }

    // --- addexclude ---
    if (sub === 'addexclude') {
      const category = interaction.options.getChannel('category');
      addExcludedCategory(interaction.guildId, category.id);
      return interaction.reply({ content: `✅ カテゴリ **${category.name}** を対象外に追加しました。`, flags: MessageFlags.Ephemeral });
    }

    // --- removeexclude ---
    if (sub === 'removeexclude') {
      const category = interaction.options.getChannel('category');
      removeExcludedCategory(interaction.guildId, category.id);
      return interaction.reply({ content: `✅ カテゴリ **${category.name}** を対象外から解除しました。`, flags: MessageFlags.Ephemeral });
    }

    // --- listexclude ---
    if (sub === 'listexclude') {
      const list = getExcludedCategories(interaction.guildId);
      const desc = list.length > 0 ? list.map(id => `\`${id}\``).join('\n') : 'なし';
      const embed = new EmbedBuilder().setTitle('除外カテゴリ一覧').setDescription(desc).setColor(0x95a5a6);
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // --- give ---
    if (sub === 'give') {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      await changeBalance(interaction.client, interaction.guildId, target.id, amount, `管理者付与 by <@${interaction.user.id}>`);
      return interaction.reply({ content: `✅ <@${target.id}> に ${amount}P を付与しました。`, flags: MessageFlags.Ephemeral });
    }

    // --- take ---
    if (sub === 'take') {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const user = getUser(target.id);
      const actual = Math.min(amount, user.balance);
      await changeBalance(interaction.client, interaction.guildId, target.id, -actual, `管理者徴収 by <@${interaction.user.id}>`);
      return interaction.reply({ content: `✅ <@${target.id}> から ${actual}P を徴収しました。`, flags: MessageFlags.Ephemeral });
    }

    // --- addshopitem ---
    if (sub === 'addshopitem') {
      const name = interaction.options.getString('name');
      const price = interaction.options.getInteger('price');
      const role = interaction.options.getRole('role');
      const result = addShopItem(interaction.guildId, name, price, role.id);
      return interaction.reply({ content: `✅ 商品 **${name}** (ID: ${result.lastInsertRowid}) を追加しました。ロール: <@&${role.id}>`, flags: MessageFlags.Ephemeral });
    }

    // --- removeshopitem ---
    if (sub === 'removeshopitem') {
      const itemId = interaction.options.getInteger('item_id');
      const result = removeShopItem(itemId, interaction.guildId);
      if (result.changes === 0) {
        return interaction.reply({ content: '❌ 指定された商品が見つかりません。', flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ content: `✅ 商品ID ${itemId} を削除しました。`, flags: MessageFlags.Ephemeral });
    }

    // --- resetranking ---
    if (sub === 'resetranking') {
      await postAndResetRanking(interaction.client);
      return interaction.reply({ content: '✅ ランキングを投稿してリセットしました。', flags: MessageFlags.Ephemeral });
    }

    // --- resetusers ---
    if (sub === 'resetusers') {
      const embed = new EmbedBuilder()
        .setTitle('⚠️ ユーザーデータリセット確認')
        .setDescription('**全ユーザー**の残高・ガチャ券・VC時間などをすべて初期値に戻します。\nこの操作は取り消せません。本当に実行しますか？')
        .setColor(0xe74c3c);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`resetusers_confirm:${interaction.user.id}`)
          .setLabel('✅ リセット実行')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`resetusers_cancel:${interaction.user.id}`)
          .setLabel('❌ キャンセル')
          .setStyle(ButtonStyle.Secondary),
      );
      return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    }
  },
};
