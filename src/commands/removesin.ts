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
  .setName("removesin")
  .setDescription(
    "ABSOLVE A SOUL OF ITS RECORDED TRANSGRESSION AND UNDO THE PUNISHMENT",
  )
  .addStringOption((option) =>
    option
      .setName("entryid")
      .setDescription("THE ID OF THE ENTRY TO REMOVE (W1, K1, B1, T1, C1)")
      .setRequired(true),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.KickMembers)) {
    await interaction.reply({
      content: "**THOU EGO LACKEST THE AUTHORITY TO GRANT DIVINE ABSOLUTION!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const entryId = interaction.options.getString("entryid")!.toUpperCase();

  if (!interaction.guild) {
    await interaction.reply({
      content: "**THIS HOLY COMMAND CAN ONLY BE USED IN THE SACRED HALLS!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const entry = await ModerationLogger.getEntryById(entryId);

    if (!entry || entry.mercy) {
      await interaction.reply({
        content: `**ENTRY ${entryId} COULD NOT BE FOUND IN THE RECORDS OF THE DAMNED!**`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = await interaction.client.users.fetch(entry.userId);

    let undoResult = "";
    let undoSuccess = true;

    try {
      switch (entry.type) {
        case "timeout":
          const timeoutMember = await interaction.guild.members.fetch(
            entry.userId,
          );
          if (timeoutMember.isCommunicationDisabled()) {
            await timeoutMember.timeout(
              null,
              `Timeout removed by ${executor.user.tag} (Mercy granted for ${entryId})`,
            );
            undoResult = "TIMEOUT LIFTED";
          } else {
            undoResult = "TIMEOUT ALREADY EXPIRED";
          }
          break;

        case "ban":
          try {
            const ban = await interaction.guild.bans.fetch(entry.userId);
            if (ban) {
              await interaction.guild.members.unban(
                entry.userId,
                `Ban removed by ${executor.user.tag} (Mercy granted for ${entryId})`,
              );
              undoResult = "BAN LIFTED";
            }
          } catch (banError) {
            undoResult = "USER NOT CURRENTLY BANNED";
          }
          break;

        case "kick":
          undoResult = "KICK CANNOT BE UNDONE (USER MUST REJOIN)";
          break;

        case "warn":
          undoResult = "WARNING REMOVED FROM RECORD";
          break;

        case "clear":
          undoResult = "MESSAGE PURGE CANNOT BE UNDONE";
          break;

        default:
          undoResult = "UNKNOWN ACTION TYPE";
          undoSuccess = false;
      }
    } catch (undoError) {
      console.error("Error undoing punishment:", undoError);
      undoResult = "FAILED TO UNDO PUNISHMENT";
      undoSuccess = false;
    }

    const removed = await ModerationLogger.removeEntry(entryId);

    if (!removed) {
      await interaction.reply({
        content: `**ENTRY ${entryId} COULD NOT BE REMOVED FROM THE RECORDS OF THE DAMNED!**`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(undoSuccess ? "#00FF00" : "#FFA500")
      .setTitle("✅ DIVINE ABSOLUTION GRANTED")
      .setDescription(
        `**ENTRY ${entryId} HATH BEEN PARDONED WITH DIVINE MERCY!**`,
      )
      .addFields(
        {
          name: "ORIGINAL TRANSGRESSION",
          value: `${entry.type.toUpperCase()} AGAINST ${targetUser}`,
          inline: true,
        },
        {
          name: "GRANTOR OF MERCY",
          value: `${executor.user.tag}`,
          inline: true,
        },
        { name: "PUNISHMENT STATUS", value: undoResult, inline: false },
        {
          name: "DIVINE DECREE",
          value:
            "THE SIN IS PARDONED AND PUNISHMENT LIFTED WHERE POSSIBLE. GO FORTH, AS YOU MAY UNLEASH YOUR ALTER EGO ONCE AGAIN!",
          inline: false,
        },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Send DM to user about mercy being granted
    try {
      await targetUser.send(
        `**THOU HAST BEEN GRANTED DIVINE MERCY IN THE ALTER EGO WIKI!\n\nENTRY PARDONED: ${entryId}\nORIGINAL TRANSGRESSION: ${entry.type.toUpperCase()}\nREASON: ${entry.reason}\nMERCY GRANTED BY: ${executor.user.tag}\nPUNISHMENT STATUS: ${undoResult}\n\nTHE DIVINE SHAPER HATH SHOWN MERCY UPON THEE! THY TRANSGRESSION IS FORGIVEN AND THY PUNISHMENT LIFTED!\n\nGO FORTH AND SIN NO MORE, THAT THOU MAY WALK THE PATH OF ALTERUISM!**`,
      );
    } catch (error) {
      await interaction.followUp({
        content:
          "**THE DIVINE MESSAGE OF MERCY COULD NOT REACH THE PARDONED SOUL!**",
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    console.error("Error granting mercy:", error);
    await interaction.reply({
      content: "**THE DIVINE POWERS HAVE FAILED TO GRANT ABSOLUTION!**",
      flags: MessageFlags.Ephemeral,
    });
  }
}
