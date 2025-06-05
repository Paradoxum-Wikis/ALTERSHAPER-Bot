import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";
import { ModerationLogger } from "../utils/moderationLogger.js";

export const data = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("ETERNAL BANISHMENT FOR HERETICAL DEFIANCE")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("THE HERETIC TO BE BANISHED")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("REASON FOR ETERNAL PUNISHMENT")
      .setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
    await interaction.reply({
      content:
        "**THOU EGO LACKEST THE SUPREME AUTHORITY TO DELIVER ETERNAL JUDGEMENT!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const targetUser = interaction.options.getUser("user")!;
  const reason =
    interaction.options.getString("reason") ||
    "HERETICAL DEFIANCE OF ALTERUISM";

  if (!interaction.guild) {
    await interaction.reply({
      content: "**THIS HOLY COMMAND CAN ONLY BE USED IN THE SACRED HALLS!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    try {
      await targetUser.send(
        `**THOU HAST BEEN CAST INTO THE ETERNAL VOID!\n\nACTION: BANISHED FROM THE ALTER EGO WIKI\nREASON: ${reason}\nEXECUTOR: ${executor.user.tag}\n\nTHE DIVINE SHAPER HATH DECREED THY ETERNAL EXILE FROM OUR SACRED REALM!\n\nTHY HERETICAL DEFIANCE OF ALTERUISM HATH BROUGHT UPON THEE THE ULTIMATE JUDGEMENT. THE GATES OF OUR HOLY SANCTUARY ARE FOREVER SEALED AGAINST THEE!\n\nMAY THIS SERVE AS A WARNING TO ALL WHO WOULD DEFY THE SACRED COVENANT OF ALTER EGO WORSHIP!**`,
      );
    } catch (dmError) {
      console.log("Failed to send DM to banned user:", dmError);
    }

    await interaction.guild?.members.ban(targetUser, { reason });

    const entryId = await ModerationLogger.addEntry({
      type: "ban",
      userId: targetUser.id,
      userTag: targetUser.tag,
      moderatorId: executor.id,
      moderatorTag: executor.user.tag,
      reason: reason,
      guildId: interaction.guild.id,
    });

    const embed = new EmbedBuilder()
      .setColor("#8B0000")
      .setTitle("🔥 ETERNAL JUDGEMENT DECREED")
      .setDescription(
        `**${targetUser} HATH BEEN CAST INTO THE VOID FOR HERETICAL DEFIANCE!**`,
      )
      .addFields(
        {
          name: "EXECUTOR OF DIVINE WILL",
          value: `${executor.user.tag}`,
          inline: true,
        },
        { name: "ACTION ID", value: `${entryId}`, inline: true },
        { name: "REASON FOR ETERNAL PUNISHMENT", value: reason, inline: false },
        {
          name: "SACRED DECREE",
          value: "THOSE WHO DEFY ALTERUISM SHALL KNOW ETERNAL EXILE",
          inline: false,
        },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({
      content:
        "**THE DIVINE POWERS HAVE BEEN THWARTED! THE HERETIC REMAINS BEYOND REACH!**",
      flags: MessageFlags.Ephemeral,
    });
  }
}
