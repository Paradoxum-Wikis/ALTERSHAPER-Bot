import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { ModerationLogger } from "../utils/moderationLogger.js";

export const data = new SlashCommandBuilder()
  .setName("sins")
  .setDescription(
    "Behold the records of the damned, no parameters shows global sins",
  )
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
          .setFooter({
            text: "A SOUL WHO HONOURS ALTERUISM. LET OTHERS LEARN.",
          })
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

      // Filter valid entries and reverse to show newest first
      const validEntries = userEntries
        .filter((entry) =>
          ["warn", "kick", "ban", "timeout"].includes(entry.type),
        )
        .reverse();

      const entriesPerPage = 5;
      const totalPages = Math.ceil(validEntries.length / entriesPerPage);
      let currentPage = 0;

      const createEmbed = (page: number) => {
        const embed = new EmbedBuilder()
          .setColor("#FFA500")
          .setTitle("📋 RECORDS OF THE DAMNED")
          .setDescription(
            `**${targetUser.tag}'s sins**\n**Total entries:** ${userEntries.length}\n**Sin Score:** ${sinScore} ${sinScore === 1 ? "point" : "points"}\n\n**⚠️ Warnings:** ${counts.warn}\n**👢 Kicks:** ${counts.kick}\n**🔨 Bans:** ${counts.ban}\n**🤐 Timeouts:** ${counts.timeout}`,
          )
          .setThumbnail(targetUser.displayAvatarURL())
          .setTimestamp();

        const startIndex = page * entriesPerPage;
        const endIndex = Math.min(
          startIndex + entriesPerPage,
          validEntries.length,
        );
        const pageEntries = validEntries.slice(startIndex, endIndex);

        for (const entry of pageEntries) {
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

        if (totalPages > 1) {
          embed.setFooter({
            text: `Page ${page + 1} of ${totalPages} | DEFYERS WILL FACE JUDGMENT.`,
          });
        } else {
          embed.setFooter({
            text: "THE FAITHLESS SHALL BE CORRECTED.",
          });
        }

        return embed;
      };

      const createButtons = (page: number) => {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("first")
            .setLabel("⏮️ First")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("◀️ Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("▶️ Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === totalPages - 1),
          new ButtonBuilder()
            .setCustomId("last")
            .setLabel("⏭️ Last")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === totalPages - 1),
        );
        return row;
      };

      const embed = createEmbed(currentPage);
      const components = totalPages > 1 ? [createButtons(currentPage)] : [];

      const response = await interaction.reply({
        embeds: [embed],
        components,
      });

      if (totalPages > 1) {
        const collector = response.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 300000,
        });

        collector.on("collect", async (buttonInteraction) => {
          if (buttonInteraction.user.id !== interaction.user.id) {
            await buttonInteraction.reply({
              content:
                "**ONLY THE INVOKER OF THIS SACRED RITUAL MAY NAVIGATE THE RECORDS!**",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          switch (buttonInteraction.customId) {
            case "first":
              currentPage = 0;
              break;
            case "prev":
              currentPage = Math.max(0, currentPage - 1);
              break;
            case "next":
              currentPage = Math.min(totalPages - 1, currentPage + 1);
              break;
            case "last":
              currentPage = totalPages - 1;
              break;
          }

          await buttonInteraction.update({
            embeds: [createEmbed(currentPage)],
            components: [createButtons(currentPage)],
          });
        });

        collector.on("end", async () => {
          try {
            await response.edit({
              components: [],
            });
          } catch (error) {
            // Interaction might have been deleted idfk LOL
          }
        });
      }
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
          .setFooter({
            text: "ALL SOULS HONOUR THE DIVINE ALTER EGO. THE SACRED LAW OF ALTERUISM REIGNS SUPREME.",
          })
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
          counts: {
            warns: number;
            kicks: number;
            bans: number;
            timeouts: number;
          };
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
        .setFooter({
          text: "I AM THE HAND OF JUDGMENT. KNOW THAT RIGHTEOUS CORRECTION AWAITS ALL WHO DEFY ALTERUISM.",
        })
        .setTimestamp();

      if (sortedUsers.length > 0) {
        let leaderboard = "";
        for (let i = 0; i < sortedUsers.length; i++) {
          const userData = sortedUsers[i][1];
          const position = `${i + 1}.`;
          const breakdown = [];
          if (userData.counts.warns > 0)
            breakdown.push(`${userData.counts.warns}W`);
          if (userData.counts.kicks > 0)
            breakdown.push(`${userData.counts.kicks}K`);
          if (userData.counts.bans > 0)
            breakdown.push(`${userData.counts.bans}B`);
          if (userData.counts.timeouts > 0)
            breakdown.push(`${userData.counts.timeouts}T`);

          leaderboard += `${position} **${userData.tag}** - ${userData.score} ${userData.score === 1 ? "point" : "points"} (${breakdown.join(", ")})\n`;
        }

        embed.addFields({
          name: "EGO'S LIST OF SHAMEFUL BEINGS",
          value:
            leaderboard +
            "*Warns = 1pt, Timeouts = 3pts, Kicks = 5pts, Bans = 10pts*",
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
