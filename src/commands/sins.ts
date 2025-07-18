import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { ModerationLogger } from "../utils/moderationLogger.js";

export const data = new SlashCommandBuilder()
  .setName("sins")
  .setDescription("Behold the records of the damned")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The soul whose sins thou seekest to view")
      .setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "**THIS HOLY COMMAND CAN ONLY BE USED IN THE SACRED HALLS!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const targetUser = interaction.options.getUser("user");

  try {
    if (targetUser) {
      // Show all moderation entries for specific user
      const userEntries = await ModerationLogger.getUserEntries(
        targetUser.id,
        interaction.guild.id,
      );

      if (userEntries.length === 0) {
        const embed = new EmbedBuilder()
          .setColor("#00FF00")
          .setTitle("📋 RECORDS OF THE DAMNED")
          .setDescription(
            `**${targetUser.tag} hath a clean slate!**\n\nNo sins recorded in the records of the damned.`,
          )
          .setThumbnail(targetUser.displayAvatarURL())
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
      }

      const counts = {
        warn: userEntries.filter((e) => e.type === "warn").length,
        kick: userEntries.filter((e) => e.type === "kick").length,
        ban: userEntries.filter((e) => e.type === "ban").length,
        timeout: userEntries.filter((e) => e.type === "timeout").length,
      };

      const embed = new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("📋 RECORDS OF THE DAMNED")
        .setDescription(
          `**${targetUser.tag}'s sins**\n**Total entries:** ${userEntries.length}\n\n**⚠️ Warnings:** ${counts.warn}\n**👢 Kicks:** ${counts.kick}\n**🔨 Bans:** ${counts.ban}\n**🤐 Timeouts:** ${counts.timeout}`,
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      // Show latest 10 entries
      const recentEntries = userEntries.slice(-10).reverse();

      for (const entry of recentEntries) {
        const date = new Date(entry.timestamp).toLocaleDateString();
        const time = new Date(entry.timestamp).toLocaleTimeString();

        const typeEmoji = {
          warn: "⚠️",
          kick: "👢",
          ban: "🔨",
          timeout: "🤐",
          clear: "🧹",
        };

        const typeName = {
          warn: "WARNING",
          kick: "KICK",
          ban: "BAN",
          timeout: "TIMEOUT",
          clear: "CLEAR",
        };

        let extraInfo = "";
        if (entry.type === "timeout" && entry.duration) {
          extraInfo = `\n**Duration:** ${entry.duration} minutes`;
        }

        embed.addFields({
          name: `${typeEmoji[entry.type]} ${typeName[entry.type]} ${entry.id}`,
          value: `**Executor:** ${entry.moderatorTag}\n**Reason:** ${entry.reason}${extraInfo}\n**Date:** ${date} at ${time}`,
          inline: false,
        });
      }

      if (userEntries.length > 10) {
        embed.setFooter({
          text: `Showing latest 10 of ${userEntries.length} entries`,
        });
      }

      await interaction.reply({ embeds: [embed] });
    } else {
      // Show serverwide stats
      const allEntries = await ModerationLogger.getAllEntries(
        interaction.guild.id,
      );

      if (allEntries.length === 0) {
        const embed = new EmbedBuilder()
          .setColor("#00FF00")
          .setTitle("📊 HOLY STATISTICS OF RIGHTEOUSNESS")
          .setDescription(
            "**The sacred halls remain pure!**\n\nNo transgressions have been recorded in this realm.",
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
      }

      const typeCounts = {
        warn: allEntries.filter((e) => e.type === "warn").length,
        kick: allEntries.filter((e) => e.type === "kick").length,
        ban: allEntries.filter((e) => e.type === "ban").length,
        timeout: allEntries.filter((e) => e.type === "timeout").length,
        clear: allEntries.filter((e) => e.type === "clear").length,
      };

      // Count warnings per user for leaderboard
      const userWarnCounts = new Map<string, { tag: string; count: number }>();

      for (const entry of allEntries.filter((e) => e.type === "warn")) {
        const existing = userWarnCounts.get(entry.userId);
        if (existing) {
          existing.count++;
        } else {
          userWarnCounts.set(entry.userId, { tag: entry.userTag, count: 1 });
        }
      }

      // Sort by warning count
      const sortedUsers = Array.from(userWarnCounts.entries())
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 10);

      const embed = new EmbedBuilder()
        .setColor("#FF6B6B")
        .setTitle("📊 HOLY STATISTICS OF TRANSGRESSIONS")
        .setDescription(
          `**Total actions recorded:** ${allEntries.length}\n\n**⚠️ Warnings:** ${typeCounts.warn}\n**👢 Kicks:** ${typeCounts.kick}\n**🔨 Bans:** ${typeCounts.ban}\n**🤐 Timeouts:** ${typeCounts.timeout}\n**🧹 Purges:** ${typeCounts.clear}`,
        )
        .setTimestamp();

      if (sortedUsers.length > 0) {
        let leaderboard = "";
        for (let i = 0; i < sortedUsers.length; i++) {
          const [userId, userData] = sortedUsers[i];
          const medal =
            i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          leaderboard += `${medal} **${userData.tag}** - ${userData.count} warning${userData.count !== 1 ? "s" : ""}\n`;
        }

        embed.addFields({
          name: "HALL OF SHAME (WARNINGS)",
          value: leaderboard,
          inline: false,
        });
      }

      await interaction.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Error fetching moderation records:", error);
    await interaction.reply({
      content:
        "**THE DIVINE POWERS HAVE FAILED TO RETRIEVE THE RECORDS OF THE DAMNED!**",
      flags: MessageFlags.Ephemeral,
    });
  }
}
