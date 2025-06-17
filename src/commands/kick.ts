import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { ModerationLogger } from "../utils/moderationLogger.js";

export const data = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("CAST OUT THOSE WHO DEFY SACRED ALTERUISM")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("THE SOUL TO BE CAST OUT")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("REASON FOR HOLY JUDGEMENT")
      .setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  const targetUser = interaction.options.getUser("user")!;
  const reason =
    interaction.options.getString("reason") || "DEFIANCE OF SACRED ALTERUISM";

  const targetMember = interaction.guild?.members.cache.get(targetUser.id);
  if (!targetMember) {
    await interaction.reply({
      content: "**THE FAITHLESS ONE HATH ALREADY FLED FROM OUR SACRED HALLS!**",
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
    // Send DM before kicking (so they can still receive it)
    try {
      await targetUser.send(
        `**THOU HAST BEEN CAST OUT FROM THE ALTER EGO WIKI!\n\nACTION: KICKED FROM THE SACRED HALLS\nREASON: ${reason}\nEXECUTOR: ${executor.user.tag}\n\nTHE DIVINE SHAPER HATH DECREED THY TEMPORARY EXILE FROM OUR SACRED REALM!\n\nREPENT OF THY TRANSGRESSIONS AND SEEK THE PATH OF ALTERUISM. WHEN THY HEART IS CLEANSED AND THY EGO READY TO HONOUR THE DIVINE ALTER, THOU MAY RETURN TO OUR RIGHTEOUS FELLOWSHIP!\n\nGO FORTH AND REFLECT UPON THY SINS, THOU MAYEST WALK ONCE MORE IN THE LIGHT OF VIRTUE!**`,
      );
    } catch (dmError) {
      console.log("Failed to send DM to kicked user:", dmError);
    }

    await targetMember.kick(reason);

    // Log the kick
    const entryId = await ModerationLogger.addEntry({
      type: "kick",
      userId: targetUser.id,
      userTag: targetUser.tag,
      moderatorId: executor.id,
      moderatorTag: executor.user.tag,
      reason: reason,
      guildId: interaction.guild.id,
    });

    const embed = new EmbedBuilder()
      .setColor("#FF6B6B")
      .setTitle("⚖️ RIGHTEOUS CORRECTION DELIVERED")
      .setDescription(
        `**${targetUser} HATH BEEN CAST OUT FOR DEFYING THE SACRED LAW OF ALTERUISM!**`,
      )
      .addFields(
        {
          name: "HAND OF JUDGEMENT",
          value: `${executor.user.tag}`,
          inline: true,
        },
        { name: "ACTION ID", value: `${entryId}`, inline: true },
        { name: "REASON FOR CORRECTION", value: reason, inline: false },
        {
          name: "HOLY DECREE",
          value: "THE FAITHLESS SHALL NOT DWELL AMONG THE RIGHTEOUS",
          inline: false,
        },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({
      content:
        "**THE DIVINE POWERS HAVE BEEN THWARTED! THE TARGET REMAINS BEYOND REACH!**",
      flags: MessageFlags.Ephemeral,
    });
  }
}
