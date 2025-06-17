import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
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

function createEmbed(
  messages: any[],
  currentPage: number,
  totalPages: number,
  actionId?: string,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor("#4169E1")
    .setTitle("📚 SERAPHIC ARCHIVES OF PURGED MESSAGES")
    .setDescription(
      actionId
        ? `**MESSAGES FROM ACTION ${actionId}**\n**TOTAL ARCHIVED: ${messages.length}**\n**PAGE ${currentPage + 1} OF ${totalPages}**`
        : `**ALL ARCHIVED MESSAGES FOR THIS GUILD**\n**TOTAL ARCHIVED: ${messages.length}**\n**PAGE ${currentPage + 1} OF ${totalPages}**`,
    )
    .setTimestamp();

  return embed;
}

function createButtons(currentPage: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("first")
      .setLabel("⏮️ First")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("previous")
      .setLabel("◀️ Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Next ▶️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1),
    new ButtonBuilder()
      .setCustomId("last")
      .setLabel("Last ⏭️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1),
  );
}

function addMessagesToEmbed(embed: EmbedBuilder, messages: any[]): void {
  for (const message of messages) {
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

  embed.addFields({
    name: "SACRED REMINDER",
    value:
      "THESE ARCHIVES ARE FOR MODERATION PURPOSES ONLY. PLEASE HANDLE WITH DISCRETION.",
    inline: false,
  });
}

export async function execute(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({
      content:
        "**THOU EGO LACKEST THE AUTHORITY TO ACCESS THE SERAPHIC ARCHIVES!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!interaction.guild) {
    await interaction.reply({
      content: "**THIS HOLY COMMAND CAN ONLY BE USED IN THE SACRED HALLS!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const actionId = interaction.options.getString("actionid") ?? undefined;

  try {
    let purgedMessages;

    if (actionId) {
      purgedMessages =
        await MessageLogger.getPurgedMessagesByActionId(actionId);

      if (purgedMessages.length === 0) {
        await interaction.reply({
          content: `**NO ARCHIVED MESSAGES FOUND FOR ACTION ID: ${actionId}**`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    } else {
      purgedMessages = await MessageLogger.getPurgedMessages(
        interaction.guild.id,
      );

      if (purgedMessages.length === 0) {
        await interaction.reply({
          content: "**NO ARCHIVED MESSAGES FOUND FOR THIS GUILD**",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    purgedMessages.reverse();

    const messagesPerPage = 5;
    const totalPages = Math.ceil(purgedMessages.length / messagesPerPage);
    let currentPage = 0;

    const embed = createEmbed(purgedMessages, currentPage, totalPages, actionId);
    const startIndex = currentPage * messagesPerPage;
    const endIndex = Math.min(startIndex + messagesPerPage, purgedMessages.length);
    const pageMessages = purgedMessages.slice(startIndex, endIndex);
    
    addMessagesToEmbed(embed, pageMessages);

    const buttons = createButtons(currentPage, totalPages);

    const response = await interaction.reply({
      embeds: [embed],
      components: totalPages > 1 ? [buttons] : [],
      flags: MessageFlags.Ephemeral,
    });

    if (totalPages > 1) {
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000,
      });

      collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          await buttonInteraction.reply({
            content: "**THOU CANNOT CONTROL ANOTHER'S ARCHIVES!**",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        switch (buttonInteraction.customId) {
          case "first":
            currentPage = 0;
            break;
          case "previous":
            currentPage = Math.max(0, currentPage - 1);
            break;
          case "next":
            currentPage = Math.min(totalPages - 1, currentPage + 1);
            break;
          case "last":
            currentPage = totalPages - 1;
            break;
        }

        const newEmbed = createEmbed(purgedMessages, currentPage, totalPages, actionId);
        const newStartIndex = currentPage * messagesPerPage;
        const newEndIndex = Math.min(newStartIndex + messagesPerPage, purgedMessages.length);
        const newPageMessages = purgedMessages.slice(newStartIndex, newEndIndex);
        
        addMessagesToEmbed(newEmbed, newPageMessages);

        const newButtons = createButtons(currentPage, totalPages);

        await buttonInteraction.update({
          embeds: [newEmbed],
          components: [newButtons],
        });
      });

      collector.on("end", async () => {
        const disabledButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("first")
            .setLabel("⏮️ First")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("previous")
            .setLabel("◀️ Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next ▶️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("last")
            .setLabel("Last ⏭️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        );

        response.edit({ components: [disabledButtons] }).catch(() => {});
      });
    }
  } catch (error) {
    console.error("Error retrieving archived messages:", error);
    await interaction.reply({
      content: "**THE DIVINE POWERS HAVE FAILED TO ACCESS THE ARCHIVES!**",
      flags: MessageFlags.Ephemeral,
    });
  }
}