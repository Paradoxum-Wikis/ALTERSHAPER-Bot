import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { ModerationLogger } from "../utils/moderationLogger.js";

export const data = new SlashCommandBuilder()
  .setName("timeout")
  .setDescription("Impose silence upon the wayward")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The transgressor to be silenced")
      .setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName("minutes")
      .setDescription("Duration of silence in minutes")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(40320),
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("Reason for silence")
      .setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  const targetUser = interaction.options.getUser("user")!;
  const duration = interaction.options.getInteger("minutes")!;
  const reason =
    interaction.options.getString("reason") || "Violation of sacred Alteruism";

  const targetMember = interaction.guild?.members.cache.get(targetUser.id);
  if (!targetMember) {
    await interaction.reply({
      content: "**THE TRANSGRESSOR HATH ALREADY FLED FROM OUR SACRED HALLS!**",
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

  try {
    await targetMember.timeout(duration * 60 * 1000, reason);

    const entryId = await ModerationLogger.addEntry({
      type: "timeout",
      userId: targetUser.id,
      userTag: targetUser.tag,
      moderatorId: executor.id,
      moderatorTag: executor.user.tag,
      reason: reason,
      guildId: interaction.guild.id,
      duration: duration,
    });

    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("🤐 DIVINE SILENCE IMPOSED")
      .setDescription(
        `**${targetUser} hath been silenced for transgressing against Alteruism!**`,
      )
      .addFields(
        {
          name: "ENFORCER OF SILENCE",
          value: `${executor.user.tag}`,
          inline: true,
        },
        { name: "ACTION ID", value: `${entryId}`, inline: true },
        {
          name: "DURATION OF REFLECTION",
          value: `${duration} minutes`,
          inline: true,
        },
        { name: "REASON FOR SILENCE", value: reason, inline: false },
        {
          name: "DIVINE WISDOM",
          value: "In silence, the wayward may find the path to Alteruism",
          inline: false,
        },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({
      content:
        "**THE DIVINE POWERS HAVE BEEN THWARTED! The transgressor remains beyond reach!**",
      flags: MessageFlags.Ephemeral,
    });
  }
}
