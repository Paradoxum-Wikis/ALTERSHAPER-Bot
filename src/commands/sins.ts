import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { ModerationLogger } from "../utils/moderationLogger.js";

export const data = new SlashCommandBuilder()
  .setName("sins")
  .setDescription("Behold the records of the damned, no parameters shows global sins")
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

      const sinScore =
        counts.warn * 1 +
        counts.kick * 5 +
        counts.ban * 10 +
        counts.timeout * 3;

      const embed = new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("📋 RECORDS OF THE DAMNED")
        .setDescription(
          `**${targetUser.tag}'s sins**\n**Total entries:** ${userEntries.length}\n**Sin Score:** ${sinScore} points\n\n**⚠️ Warnings:** ${counts.warn}\n**👢 Kicks:** ${counts.kick}\n**🔨 Bans:** ${counts.ban}\n**🤐 Timeouts:** ${counts.timeout}`,
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      // Show latest 10 entries
      const recentEntries = userEntries.slice(-10).reverse();

      for (const entry of recentEntries) {
        const date = new Date(entry.timestamp).toLocaleDateString();
        const time = new Date(entry.timestamp).toLocaleTimeString();

        const typeEmoji: Record<string, string> = {
          warn: "⚠️",
          kick: "👢",
          ban: "🔨",
          timeout: "🤐",
        };

        const typeName: Record<string, string> = {
          warn: "WARNING",
          kick: "KICK",
          ban: "BAN",
          timeout: "TIMEOUT",
        };

        // Skip clear entries since they don't apply to people
        if (!typeEmoji[entry.type] || !typeName[entry.type]) {
          continue;
        }

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

      const userSinScores = new Map<
        string,
        {
          tag: string;
          score: number;
          counts: { warns: number; kicks: number; bans: number; timeouts: number };
        }
      >();

      for (const entry of allEntries.filter((e) =>
        ["warn", "kick", "ban", "timeout"].includes(e.type),
      )) {
        const existing = userSinScores.get(entry.userId);
        const points =
          entry.type === "warn"
            ? 1
            : entry.type === "kick"
            ? 5
            : entry.type === "ban"
            ? 10
            : 3; // timeout = 3

        if (existing) {
          existing.score += points;
          if (entry.type === "warn") existing.counts.warns++;
          else if (entry.type === "kick") existing.counts.kicks++;
          else if (entry.type === "ban") existing.counts.bans++;
          else if (entry.type === "timeout") existing.counts.timeouts++;
        } else {
          const counts = { warns: 0, kicks: 0, bans: 0, timeouts: 0 };
          if (entry.type === "warn") counts.warns = 1;
          else if (entry.type === "kick") counts.kicks = 1;
          else if (entry.type === "ban") counts.bans = 1;
          else if (entry.type === "timeout") counts.timeouts = 1;

          userSinScores.set(entry.userId, {
            tag: entry.userTag,
            score: points,
            counts,
          });
        }
      }

      const sortedUsers = Array.from(userSinScores.entries())
        .sort(([, a], [, b]) => b.score - a.score)
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
          const userData = sortedUsers[i][1];
          const position = `${i + 1}.`;
          const breakdown = [];
          if (userData.counts.warns > 0) breakdown.push(`${userData.counts.warns}W`);
          if (userData.counts.kicks > 0) breakdown.push(`${userData.counts.kicks}K`);
          if (userData.counts.bans > 0) breakdown.push(`${userData.counts.bans}B`);
          if (userData.counts.timeouts > 0) breakdown.push(`${userData.counts.timeouts}T`);

          leaderboard += `${position} **${userData.tag}** - ${userData.score} points (${breakdown.join(", ")})\n`;
        }

        embed.addFields({
          name: "EGO'S LIST OF SHAMEFUL BEINGS",
          value:
            leaderboard +
            "\n*Warns = 1pt, Timeouts = 3pts, Kicks = 5pts, Bans = 10pts*",
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
