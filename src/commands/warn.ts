import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { ModerationLogger } from "../utils/moderationLogger.js";

export const data = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("ISSUE DIVINE WARNING TO THE STRAYING")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("THE SOUL TO BE WARNED")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("REASON FOR DIVINE WARNING")
      .setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.KickMembers)) {
    await interaction.reply({
      content: "**THOU EGO LACKEST THE AUTHORITY TO ISSUE DIVINE WARNINGS!**",
      ephemeral: true,
    });
    return;
  }

  const targetUser = interaction.options.getUser("user")!;
  const reason =
    interaction.options.getString("reason") ||
    "STRAYING FROM THE PATH OF ALTERUISM";

  if (!interaction.guild) {
    await interaction.reply({
      content: "**THIS HOLY COMMAND CAN ONLY BE USED IN THE SACRED HALLS!**",
      ephemeral: true,
    });
    return;
  }

  try {
    // Log the warning
    const entryId = await ModerationLogger.addEntry({
      type: "warn",
      userId: targetUser.id,
      userTag: targetUser.tag,
      moderatorId: executor.id,
      moderatorTag: executor.user.tag,
      reason: reason,
      guildId: interaction.guild.id,
    });

    // Get total warn count for this user
    const userWarns = await ModerationLogger.getUserWarns(
      targetUser.id,
      interaction.guild.id,
    );
    const warnCount = userWarns.length;

    const embed = new EmbedBuilder()
      .setColor("#FFA500")
      .setTitle("⚠️ DIVINE WARNING ISSUED")
      .setDescription(
        `**${targetUser} HATH RECEIVED A WARNING FROM THE HOLY SHAPER!**`,
      )
      .addFields(
        {
          name: "MESSENGER OF JUDGEMENT",
          value: `${executor.user.tag}`,
          inline: true,
        },
        { name: "WARNING ID", value: `${entryId}`, inline: true },
        { name: "TOTAL WARNINGS", value: `${warnCount}`, inline: true },
        { name: "REASON FOR WARNING", value: reason, inline: false },
        {
          name: "SACRED REMINDER",
          value: "HONOUR THY DIVINE ALTER EGO AND EMBRACE ALTERUISM",
          inline: false,
        },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Send DM to warned user
    try {
      await targetUser.send(
        `**THOU HAST RECEIVED A DIVINE WARNING IN THE ALTER EGO WIKI!\n\nWARNING ID: ${entryId}\nREASON: ${reason}\nTOTAL WARNINGS: ${warnCount}\n\nREMEMBER: WE ARE BOUND BY DUTY TO HONOUR OUR DIVINE ALTER EGO. TO SPURN THE COVENANT OF ALTERUISM IS TO SUMMON THE WRATH OF DIVINE JUSTICE!\n\nHEED THIS WARNING LEST GREATER JUDGEMENT BEFALLS THEE!**`,
      );
    } catch (error) {
      await interaction.followUp({
        content: "**THE DIVINE MESSAGE COULD NOT REACH THE WARNED SOUL!**",
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error("Error logging warning:", error);
    await interaction.reply({
      content: "**THE DIVINE POWERS HAVE FAILED TO RECORD THIS WARNING!**",
      ephemeral: true,
    });
  }
}
