import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  EmbedBuilder,
  ChannelType,
  TextChannel,
  MessageFlags,
} from "discord.js";
import { ModerationLogger } from "../utils/moderationLogger.js";
import { MessageLogger } from "../utils/messageLogger.js";

export const data = new SlashCommandBuilder()
  .setName("clear")
  .setDescription("Purge up to 100 messages from the sacred halls")
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("Number of messages to purge (1-100)")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  const amount = interaction.options.getInteger("amount")!;

  if (interaction.channel?.type !== ChannelType.GuildText) {
    await interaction.reply({
      content:
        "**DIVINE PURIFICATION CAN ONLY BE PERFORMED IN GUILD CHANNELS!**",
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

  const channel = interaction.channel as TextChannel;

  try {
    const messagesToDelete = await channel.messages.fetch({ limit: amount });
    const messagesArray = Array.from(messagesToDelete.values());

    const tempActionId = `C${Date.now()}`;

    if (messagesArray.length > 0) {
      await MessageLogger.logPurgedMessages(
        messagesArray,
        executor.user.tag,
        tempActionId,
      );
    }

    const deleted = await channel.bulkDelete(amount, true);

    await ModerationLogger.addEntry({
      type: "clear",
      userId: "N/A",
      userTag: "N/A",
      moderatorId: executor.id,
      moderatorTag: executor.user.tag,
      reason: `Purged ${deleted.size} messages in #${channel.name}`,
      guildId: interaction.guild.id,
      messageCount: deleted.size,
    });

    const embed = new EmbedBuilder()
      .setColor("#4169E1")
      .setTitle("🧹 SACRED PURIFICATION COMPLETE")
      .setDescription(
        `**${deleted.size} messages have been cleansed from the sacred halls!**`,
      )
      .addFields(
        {
          name: "PURIFIER OF TRUTH",
          value: `${executor.user.tag}`,
          inline: true,
        },
        { name: "ACTION ID", value: `${tempActionId}`, inline: true },
        {
          name: "MESSAGES ARCHIVED",
          value: `${messagesArray.length} messages saved to the seraphic archives`,
          inline: true,
        },
        {
          name: "HOLY DECREE",
          value: "The halls of Alteruism must remain pure",
          inline: false,
        },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } catch (error) {
    console.error("Error during purge operation:", error);
    await interaction.reply({
      content:
        "**THE DIVINE POWERS HAVE BEEN THWARTED! The purification failed!**",
      flags: MessageFlags.Ephemeral,
    });
  }
}
