import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";
import { MessageLogger } from "../utils/messageLogger.js";

export const data = new SlashCommandBuilder()
  .setName("archives")
  .setDescription("VIEW THE SERAPHIC ARCHIVES OF PURGED MESSAGES")
  .addStringOption((option) =>
    option
      .setName("actionid")
      .setDescription("THE ACTION ID TO VIEW PURGED MESSAGES FROM")
      .setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  // Check if user has permission to manage messages (same as clear command)
  if (!executor.permissions.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({
      content:
        "**THOU EGO LACKEST THE AUTHORITY TO ACCESS THE SERAPHIC ARCHIVES!**",
      ephemeral: true,
    });
    return;
  }

  if (!interaction.guild) {
    await interaction.reply({
      content: "**THIS HOLY COMMAND CAN ONLY BE USED IN THE SACRED HALLS!**",
      ephemeral: true,
    });
    return;
  }

  const actionId = interaction.options.getString("actionid");

  try {
    let purgedMessages;

    if (actionId) {
      // Get messages for specific action
      purgedMessages =
        await MessageLogger.getPurgedMessagesByActionId(actionId);

      if (purgedMessages.length === 0) {
        await interaction.reply({
          content: `**NO ARCHIVED MESSAGES FOUND FOR ACTION ID: ${actionId}**`,
          ephemeral: true,
        });
        return;
      }
    } else {
      // Get all purged messages for this guild
      purgedMessages = await MessageLogger.getPurgedMessages(
        interaction.guild.id,
      );

      if (purgedMessages.length === 0) {
        await interaction.reply({
          content: "**NO ARCHIVED MESSAGES FOUND FOR THIS GUILD**",
          ephemeral: true,
        });
        return;
      }
    }

    // Create summary embed
    const embed = new EmbedBuilder()
      .setColor("#4169E1")
      .setTitle("📚 SERAPHIC ARCHIVES OF PURGED MESSAGES")
      .setDescription(
        actionId
          ? `**MESSAGES FROM ACTION ${actionId}**\n**TOTAL ARCHIVED: ${purgedMessages.length}**`
          : `**ALL ARCHIVED MESSAGES FOR THIS GUILD**\n**TOTAL ARCHIVED: ${purgedMessages.length}**`,
      )
      .setTimestamp();

    // Show recent messages (limit to 10 for readability)
    const recentMessages = purgedMessages.slice(-10).reverse();

    for (const message of recentMessages) {
      const purgedDate = new Date(message.purgedAt).toLocaleDateString();
      const originalDate = new Date(message.timestamp).toLocaleDateString();

      let content = message.content;
      if (content.length > 100) {
        content = content.substring(0, 100) + "...";
      }

      let attachmentInfo = "";
      if (message.attachments.length > 0) {
        attachmentInfo = `\n**Attachments:** ${message.attachments.length} file(s)`;
      }

      let embedInfo = "";
      if (message.embeds.length > 0) {
        embedInfo = `\n**Embeds:** ${message.embeds.length} embed(s)`;
      }

      embed.addFields({
        name: `📜 Message by ${message.authorTag}`,
        value: `**Content:** ${content || "[NO TEXT]"}${attachmentInfo}${embedInfo}\n**Channel:** <#${message.channelId}>\n**Original Date:** ${originalDate}\n**Purged Date:** ${purgedDate}\n**Purged By:** ${message.purgedBy}\n**Action ID:** ${message.purgeActionId}`,
        inline: false,
      });
    }

    if (purgedMessages.length > 10) {
      embed.setFooter({
        text: `SHOWING LATEST 10 OF ${purgedMessages.length} ARCHIVED MESSAGES`,
      });
    }

    embed.addFields({
      name: "SACRED REMINDER",
      value:
        "THESE ARCHIVES ARE FOR MODERATION PURPOSES ONLY. PLEASE HANDLE WITH DISCRETION.",
      inline: false,
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error("Error retrieving archived messages:", error);
    await interaction.reply({
      content: "**THE DIVINE POWERS HAVE FAILED TO ACCESS THE ARCHIVES!**",
      ephemeral: true,
    });
  }
}
